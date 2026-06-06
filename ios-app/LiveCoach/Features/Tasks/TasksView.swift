import SwiftUI

/// The Tasks tab: pick a week from the dropdown, see its status + 3 weekly tasks +
/// (for completed weeks) the retrospective, and a Mon→Sun list of days. Tapping a day
/// opens its detail (tasks, score, calls).
struct TasksView: View {
    @State private var weekService = WeekService()
    @State private var retrospectiveService = RetrospectiveService()
    @State private var sessions: [DailySession] = []
    @State private var selectedWeekId: String?
    @State private var isReviewExpanded = false
    private let api = ProxyAPIClient.shared

    var body: some View {
        ScrollView {
            if weekService.weeks.isEmpty {
                emptyState
            } else if let week = selectedWeek {
                VStack(alignment: .leading, spacing: 16) {
                    weekSelector(current: week)
                    weekTasksCard(week)
                    if week.status == .complete, let retro = retrospective(for: week) {
                        retrospectiveCard(retro)
                    }
                    daysCard(week)
                }
                .padding(16)
            }
        }
        .background(Color.lcBackground)
        .task { await reload() }
        .refreshable { await reload() }
    }

    // MARK: - Selection

    /// Weeks newest-first for the dropdown.
    private var sortedWeeks: [Week] {
        weekService.weeks.sorted { $0.startDate > $1.startDate }
    }

    /// The week whose range contains today, else the active week, else the newest.
    private var defaultWeek: Week? {
        let today = TasksFormat.todayISO
        return weekService.weeks.first { $0.startDate <= today && today <= $0.endDate }
            ?? weekService.currentWeek
            ?? sortedWeeks.first
    }

    private var selectedWeek: Week? {
        if let id = selectedWeekId, let w = weekService.weeks.first(where: { $0.id == id }) { return w }
        return defaultWeek
    }

    // MARK: - Week selector + status

    private func weekSelector(current: Week) -> some View {
        Menu {
            ForEach(sortedWeeks) { week in
                Button {
                    selectedWeekId = week.id
                } label: {
                    if week.id == current.id {
                        Label(weekMenuLabel(week), systemImage: "checkmark")
                    } else {
                        Text(weekMenuLabel(week))
                    }
                }
            }
        } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text("Week \(current.weekNumber)")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(Color.lcText)
                        statusPill(current.status)
                    }
                    Text("\(TasksFormat.monthDay(current.startDate)) – \(TasksFormat.monthDay(current.endDate))")
                        .font(.system(size: 13))
                        .foregroundStyle(Color.lcTextDim)
                }
                Spacer()
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.lcTextFaint)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .background(Color.lcSurface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.lcHairline, lineWidth: 0.5))
        }
        .buttonStyle(.plain)
    }

    private func weekMenuLabel(_ week: Week) -> String {
        "Week \(week.weekNumber) · \(TasksFormat.monthDay(week.startDate)) – \(TasksFormat.monthDay(week.endDate))"
    }

    @ViewBuilder
    private func statusPill(_ status: WeekStatus) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case .active:   return ("In progress", .lcAccent)
            case .planned:  return ("Planning", .lcTextDim)
            case .complete: return ("Completed", .lcGreen)
            }
        }()
        Text(label.uppercased())
            .font(.system(size: 9, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color.opacity(0.14))
            .clipShape(Capsule())
    }

    // MARK: - Week tasks

    private func weekTasksCard(_ week: Week) -> some View {
        LCCard {
            VStack(alignment: .leading, spacing: 8) {
                LCSectionLabel(title: "This week's 3 tasks")
                if week.tasks.isEmpty {
                    Text("No tasks set yet — set them in your weekly planning call.")
                        .font(.system(size: 13))
                        .foregroundStyle(Color.lcTextFaint)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(week.tasks.enumerated()), id: \.element.id) { idx, task in
                            LCCheckRow(
                                label: task.title,
                                isChecked: task.isCompleted,
                                onToggle: { toggleWeekTask(week, task) },
                                isLast: idx == week.tasks.count - 1
                            )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Retrospective

    private func retrospectiveCard(_ retro: Retrospective) -> some View {
        LCCard {
            VStack(alignment: .leading, spacing: 10) {
                // Collapsible header — the review is collapsed by default.
                Button {
                    withAnimation(.snappy(duration: 0.25)) { isReviewExpanded.toggle() }
                } label: {
                    HStack(spacing: 8) {
                        LCSectionLabel(title: "Weekly review")
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.lcTextFaint)
                            .rotationEffect(.degrees(isReviewExpanded ? 0 : -90))
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if isReviewExpanded {
                    if !retro.summary.isEmpty {
                        Text(retro.summary)
                            .font(.system(size: 13.5))
                            .foregroundStyle(Color.lcTextDim)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    retroLine(icon: "checkmark.circle.fill", color: .lcGreen, title: "Went well", body: retro.wentWell)
                    retroLine(icon: "arrow.triangle.2.circlepath", color: .lcAmber, title: "To improve", body: retro.improve)
                    if !retro.onePercent.isEmpty {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "arrow.up.right.circle.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.lcAccent)
                                .padding(.top, 1)
                            Text(retro.onePercent)
                                .font(.system(size: 13.5, weight: .medium))
                                .foregroundStyle(Color.lcText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.lcAccentSofter)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func retroLine(icon: String, color: Color, title: String, body: String) -> some View {
        if !body.isEmpty {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Image(systemName: icon).font(.system(size: 12)).foregroundStyle(color)
                    Text(title).font(.system(size: 12, weight: .semibold)).foregroundStyle(color)
                }
                Text(body)
                    .font(.system(size: 13.5))
                    .foregroundStyle(Color.lcTextDim)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Days (Mon → Sun)

    private func daysCard(_ week: Week) -> some View {
        let days = orderedDays(for: week)
        return LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                LCSectionLabel(title: "Daily breakdown")
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 6)
                ForEach(Array(days.enumerated()), id: \.element.id) { idx, day in
                    NavigationLink {
                        DayDetailView(date: day.date, seed: day)
                    } label: {
                        dayRow(day, isLast: idx == days.count - 1)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 4)
            }
        }
    }

    private func dayRow(_ day: DailySession, isLast: Bool) -> some View {
        let isToday = day.date == TasksFormat.todayISO
        let doneCount = day.tasks.filter { $0.isCompleted }.count
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(TasksFormat.weekday(day.date))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                    if isToday { todayPill }
                }
                Text(TasksFormat.monthDay(day.date))
                    .font(.system(size: 12))
                    .foregroundStyle(Color.lcTextFaint)
            }
            Spacer()
            if !day.tasks.isEmpty {
                Text("\(doneCount)/\(day.tasks.count)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.lcTextDim)
                    .monospacedDigit()
            }
            if let score = day.score { ScoreBadge(score: Double(score)) }
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.lcTextFaint)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .background(isToday ? Color.lcAccentSofter : Color.clear)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5).padding(.leading, 20) }
        }
    }

    private var todayPill: some View {
        Text("TODAY")
            .font(.system(size: 9, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(Color.lcAccent)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.lcAccent.opacity(0.16))
            .clipShape(Capsule())
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checklist")
                .font(.system(size: 40))
                .foregroundStyle(Color.lcTextFaint)
            Text("No weeks yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Color.lcText)
            Text("Start your first weekly planning call and your coach will set up this week's 3 tasks with you.")
                .font(.system(size: 14))
                .foregroundStyle(Color.lcTextDim)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 32)
        .padding(.top, 80)
    }

    // MARK: - Data

    /// Every calendar day of the week (7 entries), Mon→Sun. Days with a real session keep
    /// it; the rest get an empty placeholder so the full week is always visible.
    private func orderedDays(for week: Week) -> [DailySession] {
        let weekDays = sessions.filter { $0.weekId == week.id }
        let byDate = Dictionary(weekDays.map { ($0.date, $0) }) { first, _ in first }
        return TasksFormat.datesInRange(from: week.startDate, to: week.endDate).map { dateStr in
            byDate[dateStr] ?? DailySession(
                id: "ph_\(week.id)_\(dateStr)", userId: "", date: dateStr, weekId: week.id,
                tasks: [], middayCallId: nil, eveningCallId: nil,
                score: nil, scoreRationale: nil, summary: nil
            )
        }
    }

    private func retrospective(for week: Week) -> Retrospective? {
        retrospectiveService.retrospectives.first { $0.weekId == week.id }
    }

    private func toggleWeekTask(_ week: Week, _ task: WeekTask) {
        Task {
            try? await weekService.toggleWeekTask(
                weekKey: weekKey(week), taskId: task.id, isCompleted: !task.isCompleted)
        }
    }

    private func weekKey(_ w: Week) -> String { String(w.id.split(separator: "_").last ?? "") }

    private func reload() async {
        await weekService.load()
        await retrospectiveService.load()
        if selectedWeekId == nil { selectedWeekId = defaultWeek?.id }
        // Load ~5 weeks of sessions so older week cards still have their day rows.
        let cal = Calendar.current
        let to = Date(); let from = cal.date(byAdding: .day, value: -35, to: to) ?? to
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        sessions = (try? await api.get("/sessions?from=\(f.string(from: from))&to=\(f.string(from: to))")) ?? []
    }
}
