import Foundation

enum VoiceCallError: Error, Equatable {
    case quotaExceeded
    case notAvailableOnFreeTier
}

@MainActor @Observable final class VoiceCallService {
    var callState: VoiceCallState = .idle
    var transcript: [Message] = []
    var currentCallId: String?
    var error: Error?

    enum VoiceCallState {
        case idle, connecting, active, ending, ended
    }

    private let api = ProxyAPIClient.shared
    private var webSocketTask: URLSessionWebSocketTask?

    func startCall(type: ConversationType, isPremium: Bool, voiceMinutesRemaining: Int) async throws {
        if !isPremium {
            throw VoiceCallError.notAvailableOnFreeTier
        }
        if voiceMinutesRemaining <= 0 {
            throw VoiceCallError.quotaExceeded
        }

        callState = .connecting
        error = nil
        transcript = []

        struct InitCallBody: Encodable { let callType: String }
        struct InitCallResponse: Decodable { let vapiCallToken: String; let callId: String }

        let response: InitCallResponse = try await api.post(
            "/vapi/init-call",
            body: InitCallBody(callType: type.vapiCallType)
        )

        currentCallId = response.callId

        guard let url = URL(string: "wss://api.vapi.ai/ws") else {
            callState = .ended
            return
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(response.vapiCallToken)", forHTTPHeaderField: "Authorization")
        let task = URLSession.shared.webSocketTask(with: request)
        task.resume()
        webSocketTask = task
        callState = .active

        Task { await receiveLoop() }
    }

    func endCall() async {
        callState = .ending
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        callState = .ended
    }

    private func receiveLoop() async {
        guard let task = webSocketTask else { return }
        do {
            while true {
                let message = try await task.receive()
                processMessage(message)
            }
        } catch {
            if callState == .active {
                callState = .ended
            }
        }
    }

    private func processMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard
                let data = text.data(using: .utf8),
                let event = try? JSONDecoder().decode(VAPITranscriptEvent.self, from: data),
                event.type == "transcript"
            else { return }
            transcript.append(Message(
                id: UUID().uuidString,
                role: event.role == "user" ? .user : .assistant,
                content: event.transcript ?? "",
                timestamp: Date()
            ))
        case .data:
            break
        @unknown default:
            break
        }
    }
}

private struct VAPITranscriptEvent: Decodable {
    let type: String
    let role: String?
    let transcript: String?
}

extension ConversationType {
    var vapiCallType: String {
        switch self {
        case .morningCall: return "morning"
        case .eveningCall: return "evening"
        case .freeChat, .freeVoice: return "free"
        }
    }
}
