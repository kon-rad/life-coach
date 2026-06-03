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
    /// Any type the server sends that this build doesn't know about (e.g. a legacy
    /// `morningCall` doc, or a future call type). Decoding to this case instead of throwing
    /// keeps one unknown row from failing the decode of the entire conversations list.
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ConversationType(rawValue: raw) ?? .unknown
    }
}

/// A coaching action taken during a voice call (set tasks, marked a task done, …),
/// recorded server-side and shown in the conversation detail.
struct CoachAction: Codable, Identifiable, Sendable {
    let name: String
    let detail: String
    let timestamp: Date

    var id: String { "\(timestamp.timeIntervalSince1970)-\(name)-\(detail)" }
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
    /// VAPI-hosted recording URL for voice calls (detail endpoint only). Empty/nil when none.
    var recordingUrl: String?
    /// Coaching actions taken during the call (detail endpoint only).
    var actions: [CoachAction]?

    /// Best available count: the list-provided total, else the loaded messages.
    var displayMessageCount: Int {
        messageCount ?? messages.count
    }
}
