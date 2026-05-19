import SwiftUI

struct NotificationSettingsView: View {
    @State private var morningTime: Date = NotificationSettingsView.storedTime(hourKey: "notif_morning_hour", minuteKey: "notif_morning_minute", defaultHour: 8)
    @State private var eveningTime: Date = NotificationSettingsView.storedTime(hourKey: "notif_evening_hour", minuteKey: "notif_evening_minute", defaultHour: 21)
    @State private var streakReminders: Bool = UserDefaults.standard.object(forKey: "notif_streak") as? Bool ?? true

    var body: some View {
        Form {
            Section("Check-in reminders") {
                DatePicker("Morning check-in", selection: $morningTime, displayedComponents: .hourAndMinute)
                    .onChange(of: morningTime) { _, _ in save() }
                DatePicker("Evening check-in", selection: $eveningTime, displayedComponents: .hourAndMinute)
                    .onChange(of: eveningTime) { _, _ in save() }
            }
            Section("Streak") {
                Toggle("Streak at-risk reminder (7 PM)", isOn: $streakReminders)
                    .onChange(of: streakReminders) { _, enabled in
                        NotificationService.shared.scheduleStreakReminder(enabled: enabled)
                        UserDefaults.standard.set(enabled, forKey: "notif_streak")
                        Task { await syncToProxy() }
                    }
            }
        }
        .navigationTitle("Notifications")
    }

    private func save() {
        let cal = Calendar.current
        let mh = cal.component(.hour, from: morningTime)
        let mm = cal.component(.minute, from: morningTime)
        let eh = cal.component(.hour, from: eveningTime)
        let em = cal.component(.minute, from: eveningTime)

        UserDefaults.standard.set(mh, forKey: "notif_morning_hour")
        UserDefaults.standard.set(mm, forKey: "notif_morning_minute")
        UserDefaults.standard.set(eh, forKey: "notif_evening_hour")
        UserDefaults.standard.set(em, forKey: "notif_evening_minute")

        NotificationService.shared.scheduleCheckInReminders(
            morningHour: mh, morningMinute: mm,
            eveningHour: eh, eveningMinute: em
        )
        Task { await syncToProxy() }
    }

    private func syncToProxy() async {
        let cal = Calendar.current
        let settings = NotificationSettings(
            morningReminderHour: cal.component(.hour, from: morningTime),
            morningReminderMinute: cal.component(.minute, from: morningTime),
            eveningReminderHour: cal.component(.hour, from: eveningTime),
            eveningReminderMinute: cal.component(.minute, from: eveningTime),
            streakReminders: streakReminders
        )
        struct ProfileBody: Encodable { let notificationSettings: NotificationSettings }
        _ = try? await ProxyAPIClient.shared.put("/user/profile", body: ProfileBody(notificationSettings: settings)) as User
    }

    private static func storedTime(hourKey: String, minuteKey: String, defaultHour: Int) -> Date {
        let hour = UserDefaults.standard.object(forKey: hourKey) as? Int ?? defaultHour
        let minute = UserDefaults.standard.object(forKey: minuteKey) as? Int ?? 0
        var components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? Date()
    }
}
