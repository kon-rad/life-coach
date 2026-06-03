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
    /// Seconds of voice used in the current ISO week (server renamed from the old
    /// misnamed `voiceMinutesUsedThisWeek`). Optional so decoding tolerates either field.
    var voiceSecondsUsedThisWeek: Int?
    var weeklyVoiceQuotaSeconds: Int
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var notificationSettings: NotificationSettings
    /// Server-authoritative subscription grant ("free" | "standard" | "premium"),
    /// e.g. from a redeemed coupon. Optional so decoding tolerates older payloads.
    var subscriptionStatus: String?
}
