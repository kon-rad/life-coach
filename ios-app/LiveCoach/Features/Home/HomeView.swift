import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) var appState
    @Environment(SessionService.self) var sessionService
    @Environment(SubscriptionService.self) var subscriptionService
    @State private var viewModel: HomeViewModel?
    @State private var showVoiceCall = false
    @State private var showPaywall = false
    @State private var showGoalsEditor = false
    @State private var voiceCallService = VoiceCallService()

    private var isMorning: Bool { Calendar.current.component(.hour, from: Date()) < 12 }
    private var greeting: String { isMorning ? "Good morning." : "Good evening." }
    private var greetingSub: String { isMorning ? "Ready when you are." : "How did today go?" }

    private var todayDateString: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: Date()).uppercased()
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if let vm = viewModel {
                    greetingSection
                    scoreCard(vm: vm)
                    goalsCard(vm: vm)
                    callCTACard(vm: vm)
                    weekTasksCard(vm: vm)
                    dayTasksCard(vm: vm)
                    statsRow(vm: vm)
                } else {
                    ProgressView()
                        .tint(Color.lcAccent)
                        .padding(.top, 60)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.lcBackground)
        .refreshable { await viewModel?.load() }
        .task {
            let vm = HomeViewModel(sessionService: sessionService, appState: appState)
            viewModel = vm
            await vm.load()
        }
        .fullScreenCover(isPresented: $showVoiceCall) {
            if let vm = viewModel {
                VoiceCallView(
                    callType: vm.selectedCallType,
                    voiceCallService: voiceCallService
                )
            }
        }
        .sheet(isPresented: $showPaywall) {
            SubscriptionPaywallView(subscriptionService: subscriptionService)
        }
        .sheet(isPresented: $showGoalsEditor) {
            if let vm = viewModel {
                GoalsEditorView(initialGoals: vm.goals) { newGoals in
                    await vm.saveGoals(newGoals)
                }
            }
        }
    }

    // MARK: - Goals

    private func goalsCard(vm: HomeViewModel) -> some View {
        LCCard(padding: 0) {
            Button {
                showGoalsEditor = true
            } label: {
                VStack(spacing: 0) {
                    HStack {
                        LCSectionLabel(title: "Goals").padding(0)
                        Spacer()
                        Image(systemName: vm.goals.isEmpty ? "plus.circle" : "pencil")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.lcTextFaint)
                    }
                    .padding(.top, 16)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 4)

                    if vm.goals.isEmpty {
                        HStack {
                            Text("Create your goals")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color.lcAccent)
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                    } else {
                        ForEach(Array(vm.goals.enumerated()), id: \.element.id) { idx, goal in
                            goalRow(goal: goal, isLast: idx == vm.goals.count - 1)
                        }
                        .padding(.bottom, 4)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    private func goalRow(goal: Goal, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "target")
                .font(.system(size: 14))
                .foregroundStyle(Color.lcAccent)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(goal.title)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.lcText)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if !goal.dueDate.isEmpty {
                    Text(Self.goalDueLabel(goal.dueDate))
                        .font(.system(size: 12))
                        .foregroundStyle(Color.lcTextFaint)
                }
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 20)
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5).padding(.leading, 20) }
        }
    }

    private static let dueInputFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static let dueOutputFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    /// "2026-12-31" → "Due Dec 31, 2026" (falls back to the raw string if unparseable).
    private static func goalDueLabel(_ iso: String) -> String {
        guard let date = dueInputFormatter.date(from: iso) else { return iso }
        return "Due " + dueOutputFormatter.string(from: date)
    }

    // MARK: - Greeting

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(todayDateString)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.lcTextFaint)
                .tracking(0.4)

            Text(greeting)
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(Color.lcText)
                .tracking(-0.8)

            Text(greetingSub)
                .font(.system(size: 17))
                .foregroundStyle(Color.lcTextDim)
                .tracking(-0.2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
        .padding(.horizontal, 4)
    }

    // MARK: - Score Card

    private func scoreCard(vm: HomeViewModel) -> some View {
        let scoreValue: Double? = vm.lastDayScore.map(Double.init)
        let weekAvg: Double? = vm.weekAverageScore
        let scoreColor: Color = scoreValue.map { Color.lcScoreColor($0) } ?? Color.lcTextFaint

        return LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    LCSectionLabel(title: "Last day").padding(0)
                    Spacer()
                }
                .padding(.top, 22)
                .padding(.horizontal, 22)

                HStack(alignment: .bottom, spacing: 6) {
                    Text(scoreValue.map { String(Int($0)) } ?? "—")
                        .font(.system(size: 92, weight: .medium, design: .monospaced))
                        .foregroundStyle(scoreColor)
                        .tracking(-4)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)

                    Text("/10")
                        .font(.system(size: 32, weight: .regular, design: .monospaced))
                        .foregroundStyle(Color.lcTextFaint)
                        .tracking(-1)
                        .padding(.bottom, 12)

                    Spacer()

                    if weekAvg != nil || vm.userStats != nil {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(weekAvg.map { String(format: "%.1f wk avg", $0) } ?? "— wk avg")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.lcTextDim)
                            Text("\(vm.userStats?.currentStreak ?? 0) day streak")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.lcTextDim)
                        }
                        .padding(.bottom, 16)
                    } else if scoreValue == nil {
                        Text("Complete your\nfirst check-in")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.lcTextDim)
                            .multilineTextAlignment(.trailing)
                            .lineSpacing(3)
                            .padding(.bottom, 16)
                    }
                }
                .padding(.horizontal, 22)
                .padding(.top, 4)
                .padding(.bottom, 6)

                // Thin accent bar at bottom of card
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [scoreColor.opacity(0.5), scoreColor.opacity(0.0)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 3)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Call CTA

    private func callCTACard(vm: HomeViewModel) -> some View {
        let isMidday = vm.selectedCallType == .midday
        let callDone = isMidday ? vm.isMiddayCallDone : vm.isEveningCallDone
        let allDone = vm.isMiddayCallDone && vm.isEveningCallDone

        return LCCard(padding: 0) {
            Button {
                guard !callDone else { return }
                // Gate before presenting so non-subscribers see the paywall, never a
                // dead "WAITING" call screen.
                guard appState.hasActivePlan else { showPaywall = true; return }
                voiceCallService = VoiceCallService()
                showVoiceCall = true
            } label: {
                HStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(callDone ? Color.lcSunken : Color.lcAccent)
                            .frame(width: 52, height: 52)
                        Image(systemName: callDone ? "checkmark" : "mic")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(callDone ? Color.lcTextDim : .white)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(callDone
                             ? (allDone ? "Great work today!" : (isMidday ? "Midday check-in complete" : "Evening call complete"))
                             : (isMidday ? "Start midday check-in" : "Start evening reflection"))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.lcText)
                            .tracking(-0.3)

                        Text(callDone
                             ? (allDone ? "See you tomorrow." : "See you \(isMidday ? "tonight" : "in the morning").")
                             : (isMidday ? "5 minutes · plan the day" : "5 minutes · score the day"))
                            .font(.system(size: 13.5))
                            .foregroundStyle(Color.lcTextDim)
                            .tracking(-0.1)
                    }

                    Spacer()

                    if !callDone {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.lcTextFaint)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 18)
            }
            .buttonStyle(.plain)
            .disabled(callDone)
        }
    }

    // MARK: - Week Tasks

    private func weekTasksCard(vm: HomeViewModel) -> some View {
        let weekTasks = vm.currentWeekTasks
        let doneCount = weekTasks.filter { $0.isCompleted }.count

        return LCCard(padding: 0) {
            VStack(spacing: 0) {
                HStack {
                    LCSectionLabel(title: "This week").padding(0)
                    Spacer()
                    if !weekTasks.isEmpty {
                        Text("\(doneCount)/\(weekTasks.count)")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.lcTextFaint)
                            .monospacedDigit()
                    }
                }
                .padding(.top, 16)
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

                if weekTasks.isEmpty {
                    Text("Your weekly tasks will appear after your planning call.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.1)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 20)
                } else {
                    ForEach(Array(weekTasks.enumerated()), id: \.element.id) { idx, task in
                        HStack(spacing: 10) {
                            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(task.isCompleted ? Color.lcAccent : Color.lcTextFaint)
                                .padding(.leading, 20)
                            Text(task.title)
                                .font(.system(size: 15))
                                .foregroundStyle(Color.lcText)
                                .strikethrough(task.isCompleted)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 14)
                                .padding(.trailing, 20)
                        }
                        .overlay(alignment: .bottom) {
                            if idx < weekTasks.count - 1 { Color.lcHairline.frame(height: 0.5) }
                        }
                    }
                    .padding(.bottom, 4)
                }
            }
        }
    }

    // MARK: - Day Tasks

    private func dayTasksCard(vm: HomeViewModel) -> some View {
        let tasks = vm.todaySession?.tasks ?? []
        let doneCount = tasks.filter { $0.isCompleted }.count

        return LCCard(padding: 0) {
            VStack(spacing: 0) {
                HStack {
                    LCSectionLabel(title: "Today's tasks").padding(0)
                    Spacer()
                    if !tasks.isEmpty {
                        Text("\(doneCount)/\(tasks.count)")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.lcTextFaint)
                            .monospacedDigit()
                    }
                }
                .padding(.top, 16)
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

                if tasks.isEmpty {
                    Text(vm.isMiddayCallDone
                         ? "Your tasks will appear shortly."
                         : "Complete your midday check-in to get today's tasks.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.1)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 20)
                } else {
                    ForEach(Array(tasks.enumerated()), id: \.element.id) { idx, task in
                        DayTaskRowView(
                            task: task,
                            isLast: idx == tasks.count - 1
                        ) { isCompleted in
                            Task { await vm.toggleDayTask(task, isCompleted: isCompleted) }
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 4)
                }
            }
        }
    }

    // MARK: - Stats Row

    private func statsRow(vm: HomeViewModel) -> some View {
        HStack(spacing: 10) {
            statMiniCard(
                label: "Streak",
                value: "\(vm.userStats?.currentStreak ?? 0)",
                unit: "days"
            )
            statMiniCard(
                label: "Avg score",
                value: vm.userStats?.averageScore.map { String(format: "%.1f", $0) } ?? "—",
                unit: "this week"
            )
        }
    }

    private func statMiniCard(label: String, value: String, unit: String) -> some View {
        LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 8) {
                LCSectionLabel(title: label).padding(0)
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text(value)
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-1)
                        .monospacedDigit()
                    Text(unit)
                        .font(.system(size: 13))
                        .foregroundStyle(Color.lcTextDim)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
