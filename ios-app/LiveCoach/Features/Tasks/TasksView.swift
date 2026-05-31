import SwiftUI

struct TasksView: View {
    @State private var weekService = WeekService()
    @State private var sessions: [DailySession] = []
    private let api = ProxyAPIClient.shared

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(sortedWeeks) { week in
                    WeekCardView(
                        week: week,
                        days: days(for: week),
                        isExpanded: week.id == weekService.currentWeek?.id,
                        onToggleWeekTask: { task in
                            Task { try? await weekService.toggleWeekTask(
                                weekKey: key(week), taskId: task.id, isCompleted: !task.isCompleted) }
                        },
                        onToggleDayTask: { day, t in
                            Task {
                                struct Body: Encodable { let isCompleted: Bool }
                                let _: DailySession = (try? await api.put(
                                    "/sessions/\(day.date)/tasks/\(t.id)/complete",
                                    body: Body(isCompleted: !t.isCompleted))) ?? day
                                await reload()
                            }
                        }
                    )
                }
            }
            .padding(16)
        }
        .background(Color.lcBackground)
        .task { await reload() }
    }

    private var sortedWeeks: [Week] {
        // current week first, then newest-first
        let cur = weekService.currentWeek?.id
        return weekService.weeks.sorted {
            if $0.id == cur { return true }; if $1.id == cur { return false }
            return $0.startDate > $1.startDate
        }
    }
    private func key(_ w: Week) -> String { String(w.id.split(separator: "_").last ?? "") }
    private func days(for week: Week) -> [DailySession] {
        sessions.filter { $0.weekId == week.id }.sorted { $0.date > $1.date }
    }
    private func reload() async {
        await weekService.load()
        // load last 14 days of sessions for day rows
        let cal = Calendar.current
        let to = Date(); let from = cal.date(byAdding: .day, value: -14, to: to) ?? to
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        sessions = (try? await api.get("/sessions?from=\(f.string(from: from))&to=\(f.string(from: to))")) ?? []
    }
}
