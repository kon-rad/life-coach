import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) var appState
    @Environment(SessionService.self) var sessionService
    @State private var viewModel: HomeViewModel?
    @State private var showVoiceCall = false
    @State private var voiceCallService = VoiceCallService()

    private var isMorning: Bool { Calendar.current.component(.hour, from: Date()) < 17 }
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
                    callCTACard(vm: vm)
                    microActionsCard(vm: vm)
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
                    callType: vm.shouldShowMorningCTA ? .morningCall : .eveningCall,
                    voiceCallService: voiceCallService
                )
            }
        }
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
        let scoreValue: Double?
        let label: String

        if let ts = vm.todayScore {
            scoreValue = Double(ts)
            label = "Today's score"
        } else if let avg = vm.displayScore {
            scoreValue = avg
            label = "Avg score"
        } else {
            scoreValue = nil
            label = "Avg score"
        }

        let scoreColor: Color = scoreValue.map { Color.lcScoreColor($0) } ?? Color.lcTextFaint

        return LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    LCSectionLabel(title: label).padding(0)
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

                    if let stats = vm.userStats, let avg = stats.averageScore {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text(String(format: "%.1f avg", avg))
                                .font(.system(size: 13))
                                .foregroundStyle(Color.lcTextDim)
                            Text("\(stats.currentStreak) day streak")
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
        let callDone = isMorning ? vm.isMorningCallDone : vm.isEveningCallDone
        let allDone = vm.isMorningCallDone && vm.isEveningCallDone

        return LCCard(padding: 0) {
            Button {
                guard !callDone else { return }
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
                             ? (allDone ? "Great work today!" : (isMorning ? "Morning call complete" : "Evening call complete"))
                             : (isMorning ? "Start morning call" : "Start evening reflection"))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.lcText)
                            .tracking(-0.3)

                        Text(callDone
                             ? (allDone ? "See you tomorrow." : "See you \(isMorning ? "tonight" : "in the morning").")
                             : (isMorning ? "5 minutes · plan the day" : "5 minutes · score the day"))
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

    // MARK: - Micro-actions

    private func microActionsCard(vm: HomeViewModel) -> some View {
        let actions = vm.todaySession?.microActions ?? []
        let doneCount = actions.filter { $0.isCompleted }.count

        return LCCard(padding: 0) {
            VStack(spacing: 0) {
                HStack {
                    LCSectionLabel(title: "Today's actions").padding(0)
                    Spacer()
                    if !actions.isEmpty {
                        Text("\(doneCount)/\(actions.count)")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.lcTextFaint)
                            .monospacedDigit()
                    }
                }
                .padding(.top, 16)
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

                if actions.isEmpty {
                    Text(vm.isMorningCallDone
                         ? "Your actions will appear shortly."
                         : "Complete your morning check-in to get today's actions.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.1)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 20)
                } else {
                    ForEach(Array(actions.enumerated()), id: \.element.id) { idx, action in
                        MicroActionRowView(
                            action: action,
                            isLast: idx == actions.count - 1
                        ) { isCompleted in
                            Task { await vm.toggleMicroAction(action, isCompleted: isCompleted) }
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
