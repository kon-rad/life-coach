import UserNotifications

@MainActor final class NotificationService {
    static let shared = NotificationService()
    private let center = UNUserNotificationCenter.current()

    func requestPermission() async -> Bool {
        let granted = (try? await center.requestAuthorization(options: [.alert, .badge, .sound])) ?? false
        return granted
    }

    func scheduleCheckInReminders(middayHour: Int, middayMinute: Int, eveningHour: Int, eveningMinute: Int) {
        center.removePendingNotificationRequests(withIdentifiers: ["midday_checkin", "evening_checkin"])

        scheduleDaily(
            identifier: "midday_checkin",
            title: "Midday check-in time",
            body: "Time for your midday check-in with your AI coach.",
            hour: middayHour,
            minute: middayMinute
        )
        scheduleDaily(
            identifier: "evening_checkin",
            title: "Evening check-in time",
            body: "Reflect on today and plan tomorrow with your AI coach.",
            hour: eveningHour,
            minute: eveningMinute
        )
    }

    func scheduleStreakReminder(enabled: Bool) {
        center.removePendingNotificationRequests(withIdentifiers: ["streak_reminder"])
        guard enabled else { return }
        scheduleDaily(
            identifier: "streak_reminder",
            title: "Don't break your streak!",
            body: "Complete at least one task today to keep going.",
            hour: 19,
            minute: 0
        )
    }

    func cancelAll() {
        center.removeAllPendingNotificationRequests()
    }

    private func scheduleDaily(identifier: String, title: String, body: String, hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        var components = DateComponents()
        components.hour = hour
        components.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        center.add(request)
    }
}
