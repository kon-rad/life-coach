import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) var appState
    @Environment(SessionService.self) var sessionService
    @State private var viewModel: HomeViewModel?
    @State private var showVoiceCallPlaceholder = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let vm = viewModel {
                    header
                    scoreCard(vm: vm)
                    if !vm.dailyQuote.isEmpty {
                        quoteCard(quote: vm.dailyQuote)
                    }
                    if let project = appState.currentProject {
                        projectPill(title: project.title)
                    }
                    microActionsSection(vm: vm)
                    checkInButton(vm: vm)
                    if let stats = vm.userStats {
                        StatsGridView(stats: stats)
                    }
                } else {
                    ProgressView()
                        .padding(.top, 40)
                }
            }
            .padding(16)
        }
        .task {
            let vm = HomeViewModel(sessionService: sessionService)
            viewModel = vm
            await vm.load()
        }
        .sheet(isPresented: $showVoiceCallPlaceholder) {
            Text("Voice call coming soon")
                .font(.title2)
                .padding()
        }
    }

    private var header: some View {
        HStack {
            Text(greetingText)
                .font(.title2)
                .bold()
            Spacer()
        }
    }

    private var greetingText: String {
        Calendar.current.component(.hour, from: Date()) < 17 ? "Good morning" : "Good evening"
    }

    private func scoreCard(vm: HomeViewModel) -> some View {
        let scoreValue: Double?
        let label: String
        let subtitle: String?

        if let ts = vm.todayScore {
            scoreValue = Double(ts)
            label = "Today's Score"
            subtitle = nil
        } else if let avg = vm.displayScore {
            scoreValue = avg.rounded()
            label = "Avg Score"
            subtitle = "\(vm.userStats?.totalDaysComplete ?? 0) check-ins"
        } else {
            scoreValue = nil
            label = "Avg Score"
            subtitle = nil
        }

        let cardColor: Color
        if let s = scoreValue {
            cardColor = s >= 7 ? .green : s >= 4 ? .orange : .red
        } else {
            cardColor = Color(.systemGray4)
        }

        return RoundedRectangle(cornerRadius: 16)
            .fill(cardColor)
            .frame(maxWidth: .infinity)
            .frame(height: 120)
            .overlay {
                VStack(spacing: 4) {
                    Text(scoreValue.map { String(format: "%.1f", $0) } ?? "—")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(.white)
                    Text(label)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
            }
    }

    private func quoteCard(quote: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(quote)
                .font(.body)
                .italic()
            Text("Daily reminder")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func projectPill(title: String) -> some View {
        HStack(spacing: 8) {
            Text("🎯")
            Text(title)
                .font(.subheadline)
                .lineLimit(1)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(.systemGray5))
        .clipShape(Capsule())
    }

    private func microActionsSection(vm: HomeViewModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Actions")
                .font(.headline)

            if vm.todaySession?.microActions.isEmpty ?? true, !vm.isMorningCallDone {
                Text("Complete your morning check-in to get today's actions")
                    .font(.subheadline)
                    .italic()
                    .foregroundStyle(.secondary)
            } else {
                ForEach(vm.todaySession?.microActions ?? []) { action in
                    MicroActionRowView(action: action) { isCompleted in
                        Task { await vm.toggleMicroAction(action, isCompleted: isCompleted) }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func checkInButton(vm: HomeViewModel) -> some View {
        if vm.isMorningCallDone && vm.isEveningCallDone {
            Button {} label: {
                Text("Great work today! 🎉")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(true)
        } else {
            Button {
                showVoiceCallPlaceholder = true
            } label: {
                Text(vm.shouldShowMorningCTA ? "Start morning check-in →" : "Start evening check-in →")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}
