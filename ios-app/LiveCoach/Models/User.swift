import Foundation

struct NotificationSettings: Codable, Sendable {
    var middayReminderHour: Int
    var middayReminderMinute: Int
    var eveningReminderHour: Int
    var eveningReminderMinute: Int
    var weeklyPlanningWeekday: Int      // 0=Sun ... 6=Sat
    var weeklyPlanningHour: Int
    var weeklyPlanningMinute: Int
    var timeZone: String                // IANA, e.g. "America/New_York"
    var streakReminders: Bool
}

struct User: Codable, Identifiable, Sendable {
    let id: String
    var displayName: String
    var bio: String
    var coachingStyle: String
    var occupation: String
    var motivation: String
    var createdAt: Date
    var voiceMinutesUsedThisWeek: Int
    var weeklyVoiceQuotaSeconds: Int
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var notificationSettings: NotificationSettings
}
