import Foundation

enum DemoMode {
    #if DEBUG
    static let isEnabled = true
    #else
    static let isEnabled = false
    #endif

    static let user = User(
        id: "demo-user",
        displayName: "Alex Johnson",
        createdAt: Calendar.current.date(byAdding: .day, value: -42, to: Date()) ?? Date(),
        voiceMinutesUsedThisWeek: 18,
        weeklyVoiceQuotaSeconds: 3600,
        totalVoiceSecondsUsed: 5400,
        totalChatMessages: 87,
        notificationSettings: NotificationSettings(
            morningReminderHour: 8,
            morningReminderMinute: 0,
            eveningReminderHour: 21,
            eveningReminderMinute: 0,
            streakReminders: true
        )
    )

    static let project = Project(
        id: "demo-project",
        userId: "demo-user",
        title: "Launch my coaching business",
        description: "Build and launch a 1:1 coaching practice with 5 paying clients in 90 days.",
        createdAt: Calendar.current.date(byAdding: .day, value: -42, to: Date()) ?? Date(),
        isActive: true
    )

    static let userStats = UserStats(
        currentStreak: 14,
        totalDaysComplete: 28,
        totalMicroActionsDone: 63,
        totalVoiceSecondsUsed: 5400,
        totalChatMessages: 87,
        averageScore: 7.8,
        voiceMinutesRemainingThisWeek: 42
    )

    static let todaySession = DailySession(
        id: "demo-session",
        userId: "demo-user",
        date: ISO8601DateFormatter().string(from: Date()).prefix(10).description,
        microActions: [
            MicroAction(id: "a1", title: "Send 3 outreach messages to potential clients", isCompleted: true, completedAt: Date()),
            MicroAction(id: "a2", title: "Update website with testimonials page", isCompleted: true, completedAt: Date()),
            MicroAction(id: "a3", title: "Record intro video for landing page", isCompleted: false, completedAt: nil)
        ],
        morningCallId: "demo-morning-call",
        eveningCallId: nil,
        score: 8,
        scoreRationale: "Strong focus and follow-through on client outreach today.",
        tomorrowMicroActions: nil
    )
}
