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

    private var vapi: Vapi?
    private var cancellable: AnyCancellable?
    /// id of the trailing "live" partial-transcript bubble, if any.
    private var livePartialId: String?

    private struct InitCallResponse: Decodable {
        let conversationId: String
        let assistantId: String
        let systemPrompt: String
        let metadata: Meta
        struct Meta: Decodable {
            let userId: String
            let callType: String
            let conversationId: String
        }
    }

    func startCall(type: CoachCallType, isPremium: Bool, voiceMinutesRemaining: Int) async throws {
        if !isPremium { throw VoiceCallError.notAvailableOnFreeTier }
        if voiceMinutesRemaining <= 0 { throw VoiceCallError.quotaExceeded }

        callState = .connecting
        error = nil
        transcript = []
        livePartialId = nil

        struct Body: Encodable { let callType: String }
        let resp: InitCallResponse = try await ProxyAPIClient.shared.post(
            "/vapi/init-call",
            body: Body(callType: type.rawValue)
        )

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
            "variableValues": ["systemPrompt": resp.systemPrompt]
        ]

        do {
            _ = try await vapi.start(
                assistantId: resp.assistantId,
                metadata: metadata,
                assistantOverrides: assistantOverrides
            )
        } catch {
            self.error = error
            callState = .ended
            cleanup()
            throw error
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
            callState = .active
        case .callDidEnd:
            callState = .ended
            cleanup()
        case .transcript(let t):
            handleTranscript(t)
        case .error(let e):
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
        vapi = nil
    }
}
