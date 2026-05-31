import Foundation

struct UserStats: Codable, Sendable {
    var currentStreak: Int
    var totalDaysComplete: Int
    var totalMicroActionsDone: Int
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var averageScore: Double?
    var voiceMinutesRemainingThisWeek: Int
}
