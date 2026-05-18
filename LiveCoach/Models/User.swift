import Foundation

struct NotificationSettings: Codable, Sendable {
    var morningReminderHour: Int
    var morningReminderMinute: Int
    var eveningReminderHour: Int
    var eveningReminderMinute: Int
    var streakReminders: Bool
}

struct User: Codable, Identifiable, Sendable {
    let id: String
    var displayName: String
    var createdAt: Date
    var voiceMinutesUsedThisWeek: Int
    var weeklyVoiceQuotaSeconds: Int
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var notificationSettings: NotificationSettings
}
