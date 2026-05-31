import Foundation

enum ChatError: Error {
    case dailyLimitReached
    case streamFailed
}

@MainActor
@Observable final class ChatService {
    var conversations: [Conversation] = []
    var isLoading = false
    private let api = ProxyAPIClient.shared

    func loadConversations() async throws {
        isLoading = true
        defer { isLoading = false }
        conversations = try await api.get("/conversations")
    }

    func createConversation(type: ConversationType) async throws -> Conversation {
        struct Body: Encodable { let type: String }
        let conv: Conversation = try await api.post("/conversations", body: Body(type: type.rawValue))
        conversations.insert(conv, at: 0)
        return conv
    }

    func getConversation(id: String) async throws -> Conversation {
        try await api.get("/conversations/\(id)")
    }

    func sendMessage(conversationId: String, text: String) -> AsyncThrowingStream<String, Error> {
        struct Body: Encodable { let conversationId: String; let message: String }
        let rawStream = api.stream("/chat", body: Body(conversationId: conversationId, message: text))
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    for try await chunk in rawStream {
                        continuation.yield(chunk)
                    }
                    continuation.finish()
                } catch let apiError as APIError {
                    if case .httpError(402, _) = apiError {
                        continuation.finish(throwing: ChatError.dailyLimitReached)
                    } else {
                        continuation.finish(throwing: apiError)
                    }
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
