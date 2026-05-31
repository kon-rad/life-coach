import SwiftUI

struct NotificationSettingsView: View {
    @State private var middayTime: Date = NotificationSettingsView.storedTime(hourKey: "notif_midday_hour", minuteKey: "notif_midday_minute", defaultHour: 11, defaultMinute: 30)
    @State private var eveningTime: Date = NotificationSettingsView.storedTime(hourKey: "notif_evening_hour", minuteKey: "notif_evening_minute", defaultHour: 20, defaultMinute: 0)
    @State private var weeklyPlanningWeekday: Int = UserDefaults.standard.object(forKey: "notif_weekly_weekday") as? Int ?? 0
    @State private var weeklyPlanningTime: Date = NotificationSettingsView.storedTime(hourKey: "notif_weekly_hour", minuteKey: "notif_weekly_minute", defaultHour: 19, defaultMinute: 0)
    @State private var streakReminders: Bool = UserDefaults.standard.object(forKey: "notif_streak") as? Bool ?? true

    private let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    var body: some View {
        Form {
            Section("Check-in reminders") {
                DatePicker("Midday check-in", selection: $middayTime, displayedComponents: .hourAndMinute)
                    .onChange(of: middayTime) { _, _ in save() }
                DatePicker("Evening check-in", selection: $eveningTime, displayedComponents: .hourAndMinute)
                    .onChange(of: eveningTime) { _, _ in save() }
            }
            Section("Weekly planning") {
                Picker("Day", selection: $weeklyPlanningWeekday) {
                    ForEach(0..<7, id: \.self) { idx in
                        Text(weekdays[idx]).tag(idx)
                    }
                }
                .onChange(of: weeklyPlanningWeekday) { _, _ in save() }
                DatePicker("Time", selection: $weeklyPlanningTime, displayedComponents: .hourAndMinute)
                    .onChange(of: weeklyPlanningTime) { _, _ in save() }
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
        let mh = cal.component(.hour, from: middayTime)
        let mm = cal.component(.minute, from: middayTime)
        let eh = cal.component(.hour, from: eveningTime)
        let em = cal.component(.minute, from: eveningTime)
        let wh = cal.component(.hour, from: weeklyPlanningTime)
        let wm = cal.component(.minute, from: weeklyPlanningTime)

        UserDefaults.standard.set(mh, forKey: "notif_midday_hour")
        UserDefaults.standard.set(mm, forKey: "notif_midday_minute")
        UserDefaults.standard.set(eh, forKey: "notif_evening_hour")
        UserDefaults.standard.set(em, forKey: "notif_evening_minute")
        UserDefaults.standard.set(weeklyPlanningWeekday, forKey: "notif_weekly_weekday")
        UserDefaults.standard.set(wh, forKey: "notif_weekly_hour")
        UserDefaults.standard.set(wm, forKey: "notif_weekly_minute")

        NotificationService.shared.scheduleCheckInReminders(
            middayHour: mh, middayMinute: mm,
            eveningHour: eh, eveningMinute: em
        )
        Task { await syncToProxy() }
    }

    private func syncToProxy() async {
        let cal = Calendar.current
        let settings = NotificationSettings(
            middayReminderHour: cal.component(.hour, from: middayTime),
            middayReminderMinute: cal.component(.minute, from: middayTime),
            eveningReminderHour: cal.component(.hour, from: eveningTime),
            eveningReminderMinute: cal.component(.minute, from: eveningTime),
            weeklyPlanningWeekday: weeklyPlanningWeekday,
            weeklyPlanningHour: cal.component(.hour, from: weeklyPlanningTime),
            weeklyPlanningMinute: cal.component(.minute, from: weeklyPlanningTime),
            timeZone: TimeZone.current.identifier,
            streakReminders: streakReminders
        )
        struct ProfileBody: Encodable { let notificationSettings: NotificationSettings }
        _ = try? await ProxyAPIClient.shared.put("/user/profile", body: ProfileBody(notificationSettings: settings)) as User
    }

    private static func storedTime(hourKey: String, minuteKey: String, defaultHour: Int, defaultMinute: Int = 0) -> Date {
        let hour = UserDefaults.standard.object(forKey: hourKey) as? Int ?? defaultHour
        let minute = UserDefaults.standard.object(forKey: minuteKey) as? Int ?? defaultMinute
        var components = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components) ?? Date()
    }
}
