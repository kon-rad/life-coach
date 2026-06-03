import Foundation

struct DayTask: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

struct DailySession: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let date: String
    var weekId: String?
    var tasks: [DayTask]
    var middayCallId: String?
    var eveningCallId: String?
    var score: Int?
    var scoreRationale: String?
    /// Narrative summary of the day from the evening check-in (decrypted by the proxy).
    var summary: String?
    /// Personalized coach advice for the day, produced by the end-of-day scoring call.
    var advice: String?
}
