import Foundation

enum MessageRole: String, Codable, Sendable {
    case user, assistant
}

struct Message: Codable, Identifiable, Sendable {
    let id: String
    var role: MessageRole
    var content: String
    let timestamp: Date
}

enum ConversationType: String, Codable, Sendable {
    case morningCall, eveningCall, freeChat, freeVoice
}

struct Conversation: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    var type: ConversationType
    var messages: [Message]
    var vapiCallId: String?
    var durationSeconds: Int?
    let createdAt: Date
    var summary: String?
}
