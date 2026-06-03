import Combine
import Foundation
import Vapi

enum VoiceCallError: Error, Equatable {
    case quotaExceeded
    case notAvailableOnFreeTier
    case unavailable
}

/// Drives an in-app voice call through the official Vapi iOS SDK.
///
/// Flow: the proxy's `/vapi/init-call` builds the personalized, encrypted system
/// prompt and creates the `conversations` record, returning the prompt + metadata.
/// The SDK then places the actual web call (mic + audio over WebRTC). When the call
/// ends, VAPI posts the transcript to the proxy webhook, which persists it to the
/// same conversation — so voice history is stored exactly like text chat.
@MainActor @Observable final class VoiceCallService {
    enum VoiceCallState {
        case idle, connecting, active, ending, ended
    }

    var callState: VoiceCallState = .idle
    var transcript: [Message] = []
    var error: Error?
    /// Seconds of weekly voice quota the user had left when this call started (from the
    /// proxy's `/vapi/init-call`). The call is hard-capped at `min(perCallCap, this)` server-
    /// side, so the in-call countdown derived from it reflects the real "stop when empty" bound.
    var remainingSecondsAtStart: Int?

    private var vapi: Vapi?
    private var cancellable: AnyCancellable?
    /// id of the trailing "live" partial-transcript bubble, if any.
    private var livePartialId: String?
    /// Fires if `.callDidStart` never arrives, so a silent WebRTC/mic failure
    /// surfaces as an error instead of hanging forever on "Connecting".
    private var connectTimeoutTask: Task<Void, Never>?
    private let connectTimeout: Duration = .seconds(20)

    private struct InitCallResponse: Decodable {
        let conversationId: String
        let assistantId: String
        let systemPrompt: String
        /// Per-call hard cap (seconds) from the proxy: min(420 daily / 900 weekly, weekly balance).
        let maxDurationSeconds: Int
        /// Seconds left in the user's weekly voice pool at call start.
        let remainingSeconds: Int
        let metadata: Meta
        struct Meta: Decodable {
            let userId: String
            let callType: String
            let conversationId: String
        }
    }

    /// `hasActivePlan` = any paid tier (standard or premium). The server is the source
    /// of truth for the weekly minute quota and will reject with 402 when exhausted;
    /// that 402 is surfaced here as `.quotaExceeded`.
    func startCall(type: CoachCallType, hasActivePlan: Bool) async throws {
        if !hasActivePlan { throw VoiceCallError.notAvailableOnFreeTier }

        callState = .connecting
        error = nil
        transcript = []
        livePartialId = nil
        remainingSecondsAtStart = nil

        struct Body: Encodable { let callType: String }
        print("[VoiceCall] requesting /vapi/init-call type=\(type.rawValue)")
        let resp: InitCallResponse
        do {
            resp = try await ProxyAPIClient.shared.post(
                "/vapi/init-call",
                body: Body(callType: type.rawValue)
            )
        } catch {
            // Don't leave the UI stuck on "Connecting" — surface the failure.
            print("[VoiceCall] init-call failed: \(error)")
            callState = .ended
            // A 402 means the weekly voice quota is exhausted — surface that specifically.
            if case APIError.httpError(402, _) = error {
                throw VoiceCallError.quotaExceeded
            }
            self.error = error
            throw error
        }
        print("[VoiceCall] init-call ok; assistantId=\(resp.assistantId)")
        remainingSecondsAtStart = resp.remainingSeconds

        let vapi = Vapi(publicKey: Constants.vapiPublicKey)
        self.vapi = vapi
        subscribe(to: vapi)

        let metadata: [String: Any] = [
            "userId": resp.metadata.userId,
            "callType": resp.metadata.callType,
            "conversationId": resp.metadata.conversationId,
        ]
        // Inject the server-built system prompt via a template variable rather than a
        // partial `model` override: `assistantOverrides.model` is a provider-discriminated
        // union, so sending only `messages` (no `provider`/`model`) is rejected with a 400.
        // The VAPI assistant's system prompt must be set to `{{systemPrompt}}` in the dashboard.
        let assistantOverrides: [String: Any] = [
            "variableValues": ["systemPrompt": resp.systemPrompt],
            "maxDurationSeconds": resp.maxDurationSeconds,
        ]

        do {
            _ = try await vapi.start(
                assistantId: resp.assistantId,
                metadata: metadata,
                assistantOverrides: assistantOverrides
            )
            print("[VoiceCall] vapi.start() returned; awaiting .callDidStart")
            startConnectWatchdog()
        } catch {
            print("[VoiceCall] vapi.start() threw: \(error)")
            self.error = error
            callState = .ended
            cleanup()
            throw error
        }
    }

    /// If the call never reaches `.callDidStart` within `connectTimeout`, stop the
    /// SDK and surface an actionable error rather than hanging on "Connecting".
    private func startConnectWatchdog() {
        connectTimeoutTask?.cancel()
        connectTimeoutTask = Task { [weak self] in
            try? await Task.sleep(for: self?.connectTimeout ?? .seconds(20))
            guard let self, !Task.isCancelled, self.callState == .connecting else { return }
            print("[VoiceCall] connect timeout — no .callDidStart event")
            self.vapi?.stop()
            self.error = NSError(
                domain: "VoiceCall", code: -1001,
                userInfo: [NSLocalizedDescriptionKey: "Connection timed out before the call started."]
            )
            self.callState = .ended
            self.cleanup()
        }
    }

    func setMuted(_ muted: Bool) {
        let vapi = self.vapi
        Task { try? await vapi?.setMuted(muted) }
    }

    func endCall() async {
        guard callState == .connecting || callState == .active else { return }
        callState = .ending
        vapi?.stop()
        // `.callDidEnd` arrives via the publisher and finalizes state; this is a fallback.
    }

    // MARK: - Events

    private func subscribe(to vapi: Vapi) {
        cancellable = vapi.eventPublisher.sink { [weak self] event in
            Task { @MainActor in self?.handle(event) }
        }
    }

    private func handle(_ event: Vapi.Event) {
        switch event {
        case .callDidStart:
            connectTimeoutTask?.cancel()
            print("[VoiceCall] .callDidStart")
            callState = .active
        case .callDidEnd:
            connectTimeoutTask?.cancel()
            print("[VoiceCall] .callDidEnd")
            callState = .ended
            cleanup()
        case .transcript(let t):
            handleTranscript(t)
        case .error(let e):
            connectTimeoutTask?.cancel()
            print("[VoiceCall] .error event: \(e)")
            error = e
            callState = .ended
            cleanup()
        default:
            break
        }
    }

    private func handleTranscript(_ t: Transcript) {
        let role: MessageRole = (t.role == .user) ? .user : .assistant

        if t.transcriptType == .final {
            if let last = transcript.last, last.id == livePartialId {
                transcript.removeLast()
            }
            livePartialId = nil
            transcript.append(Message(id: UUID().uuidString, role: role, content: t.transcript, timestamp: Date()))
        } else {
            if let last = transcript.last, last.id == livePartialId, last.role == role {
                transcript[transcript.count - 1].content = t.transcript
            } else {
                let id = UUID().uuidString
                livePartialId = id
                transcript.append(Message(id: id, role: role, content: t.transcript, timestamp: Date()))
            }
        }
    }

    private func cleanup() {
        connectTimeoutTask?.cancel()
        connectTimeoutTask = nil
        vapi = nil
    }
}
