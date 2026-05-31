import SwiftUI

struct ProjectView: View {
    @Environment(AppState.self) private var appState
    @State private var projectService = ProjectService()
    @State private var viewModel: ProjectViewModel?
    @State private var showEditSheet = false

    private let sessionDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if let vm = viewModel {
                    if let project = vm.project {
                        projectHeader(project: project, vm: vm)
                        historySection(vm: vm)
                    } else if !vm.isLoading {
                        ContentUnavailableView(
                            "No Project Yet",
                            systemImage: "target",
                            description: Text("Complete onboarding to set your goal.")
                        )
                        .foregroundStyle(Color.lcTextDim)
                    }

                    if vm.isLoading {
                        ProgressView().tint(Color.lcAccent).padding(.top, 20)
                    }
                } else {
                    ProgressView().tint(Color.lcAccent).padding(.top, 60)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.lcBackground)
        .task {
            let vm = ProjectViewModel(projectService: projectService)
            viewModel = vm
            await vm.load()
        }
    }

    // MARK: - Project Header

    private func projectHeader(project: Project, vm: ProjectViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            LCSectionLabel(title: "Current goal")
                .padding(.top, 8)
                .padding(.horizontal, 4)
                .padding(.bottom, 8)

            VStack(alignment: .leading, spacing: 6) {
                Text(project.title)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                    .tracking(-0.7)
                    .lineSpacing(4)

                if !project.description.isEmpty {
                    Text(project.description)
                        .font(.system(size: 15))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.2)
                        .lineSpacing(4)
                } else {
                    HStack(spacing: 8) {
                        ProgressView().tint(Color.lcAccent).scaleEffect(0.8)
                        Text("Generating description…")
                            .font(.system(size: 15))
                            .foregroundStyle(Color.lcTextDim)
                    }
                }
            }
            .padding(.horizontal, 4)

            // Edit button
            Button { showEditSheet = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "pencil")
                        .font(.system(size: 13))
                    Text("Edit goal")
                        .font(.system(size: 15, weight: .medium))
                        .tracking(-0.2)
                }
                .foregroundStyle(Color.lcText)
                .padding(.horizontal, 18)
                .frame(height: 46)
                .background(Color.lcSurface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.lcHairlineStrong, lineWidth: 0.5)
                )
            }
            .buttonStyle(.plain)
            .padding(.top, 14)
        }
        .sheet(isPresented: $showEditSheet) {
            EditProjectView(project: project, projectService: projectService)
                .onDisappear { Task { await vm.load() } }
        }
    }

    // MARK: - History

    private func historySection(vm: ProjectViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            LCSectionLabel(title: "History")
                .padding(.horizontal, 4)
                .padding(.top, 14)
                .padding(.bottom, 8)

            LCCard(padding: 0) {
                let sorted = vm.sessions.sorted { $0.date > $1.date }
                VStack(spacing: 0) {
                    ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, session in
                        historyRow(session: session, vm: vm, isLast: idx == sorted.count - 1)
                    }
                }
            }
        }
    }

    private func historyRow(session: DailySession, vm: ProjectViewModel, isLast: Bool) -> some View {
        let score = session.score ?? 0
        let scoreColor = score > 0 ? Color.lcScoreColor(Double(score)) : Color.lcTextFaint
        let actionsCompleted = session.microActions.filter { $0.isCompleted }.count
        let isToday = session.date == sessionDateFormatter.string(from: Date())

        return HStack(alignment: .center, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(score > 0 ? scoreColor.opacity(0.12) : Color.lcSunken)
                    .frame(width: 42, height: 42)
                if score > 0 {
                    Text("\(score)")
                        .font(.system(size: 18, weight: .semibold, design: .monospaced))
                        .foregroundStyle(scoreColor)
                } else {
                    Text("—")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.lcTextFaint)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline) {
                    Text(isToday ? "Today" : friendlyDate(session.date))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-0.2)
                    Spacer()
                    Text("\(actionsCompleted)/\(session.microActions.count) actions")
                        .font(.system(size: 12.5))
                        .foregroundStyle(Color.lcTextFaint)
                        .monospacedDigit()
                }
                if !session.microActions.isEmpty {
                    Text(session.microActions.first(where: { !$0.isCompleted })?.title
                         ?? session.microActions.last?.title ?? "")
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.1)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5).padding(.leading, 72) }
        }
    }

    private func friendlyDate(_ str: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        guard let date = f.date(from: str) else { return str }
        let out = DateFormatter()
        out.dateFormat = "MMM d"
        return out.string(from: date)
    }
}
