import Foundation

enum DemoMode {
    static let isEnabled = false

    static let user = User(
        id: "demo-user",
        displayName: "Alex Johnson",
        bio: "Designer turned solo founder, trying to ship my first product while staying healthy.",
        coachingStyle: "balanced",
        occupation: "Product designer",
        motivation: "Build something that's truly mine and have the freedom to work on my own terms.",
        createdAt: Calendar.current.date(byAdding: .day, value: -42, to: Date()) ?? Date(),
        voiceMinutesUsedThisWeek: 18,
        weeklyVoiceQuotaSeconds: 3600,
        totalVoiceSecondsUsed: 5400,
        totalChatMessages: 87,
        notificationSettings: NotificationSettings(
            middayReminderHour: 11,
            middayReminderMinute: 30,
            eveningReminderHour: 20,
            eveningReminderMinute: 0,
            weeklyPlanningWeekday: 0,
            weeklyPlanningHour: 19,
            weeklyPlanningMinute: 0,
            timeZone: TimeZone.current.identifier,
            streakReminders: true
        )
    )

    static let currentWeek = Week(
        id: "demo-user_2026-W23",
        userId: "demo-user",
        weekNumber: 23,
        year: 2026,
        startDate: "2026-06-01",
        endDate: "2026-06-07",
        tasks: [
            WeekTask(id: "wt1", title: "Launch coaching business website", isCompleted: true),
            WeekTask(id: "wt2", title: "Reach out to 5 potential clients", isCompleted: false),
            WeekTask(id: "wt3", title: "Record intro video", isCompleted: false)
        ],
        status: .active,
        retrospectiveId: nil,
        createdAt: Date()
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
        weekId: "demo-user_2026-W23",
        tasks: [
            DayTask(id: "a1", title: "Send 3 outreach messages to potential clients", isCompleted: true, completedAt: Date()),
            DayTask(id: "a2", title: "Update website with testimonials page", isCompleted: true, completedAt: Date()),
            DayTask(id: "a3", title: "Record intro video for landing page", isCompleted: false, completedAt: nil)
        ],
        middayCallId: "demo-midday-call",
        eveningCallId: nil,
        score: 8,
        scoreRationale: "Strong focus and follow-through on client outreach today."
    )
}
