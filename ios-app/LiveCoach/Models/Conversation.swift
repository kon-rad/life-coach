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
    case middayCall, eveningCall, weeklyCall, freeChat, freeVoice
}

enum CoachCallType: String, CaseIterable, Identifiable, Sendable {
    case midday, evening, weekly, free
    var id: String { rawValue }
    var label: String {
        switch self {
        case .midday: return "Midday check-in"
        case .evening: return "Evening debrief"
        case .weekly: return "Weekly planning"
        case .free: return "Free call"
        }
    }
}

struct Conversation: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    var type: ConversationType
    var messages: [Message]
    /// Total message count from the list endpoint (message bodies are omitted there).
    /// nil on detail/create responses, where `messages` holds the full history.
    var messageCount: Int?
    var vapiCallId: String?
    var durationSeconds: Int?
    let createdAt: Date
    var summary: String?

    /// Best available count: the list-provided total, else the loaded messages.
    var displayMessageCount: Int {
        messageCount ?? messages.count
    }
}
