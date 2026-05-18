import SwiftUI

struct ProjectView: View {
    @Environment(AppState.self) private var appState
    @State private var projectService = ProjectService()
    @State private var viewModel: ProjectViewModel?
    @State private var showEditSheet = false

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f
    }()

    private let sessionDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        NavigationStack {
            Group {
                if let vm = viewModel {
                    projectContent(vm: vm)
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Project")
            .task {
                let vm = ProjectViewModel(projectService: projectService)
                viewModel = vm
                await vm.load()
            }
        }
    }

    @ViewBuilder
    private func projectContent(vm: ProjectViewModel) -> some View {
        if vm.isLoading && vm.project == nil {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let project = vm.project {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16, pinnedViews: []) {
                    projectHeaderCard(project: project, vm: vm)

                    if vm.isLoading {
                        ProgressView()
                            .padding()
                    }

                    if let error = vm.error {
                        Text(error.localizedDescription)
                            .foregroundStyle(.red)
                            .font(.caption)
                            .padding(.horizontal)
                    }

                    sessionHistory(vm: vm)
                }
                .padding(.vertical)
            }
            .sheet(isPresented: $showEditSheet) {
                EditProjectView(project: project, projectService: projectService)
                    .onDisappear {
                        Task { await vm.load() }
                    }
            }
        } else {
            ContentUnavailableView("No Project Yet", systemImage: "target", description: Text("Complete onboarding to set your goal."))
        }
    }

    @ViewBuilder
    private func projectHeaderCard(project: Project, vm: ProjectViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(project.title)
                .font(.title2.bold())

            if !project.description.isEmpty {
                Text(project.description)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            Button("Edit project") { showEditSheet = true }
                .font(.subheadline)
                .padding(.top, 2)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    @ViewBuilder
    private func sessionHistory(vm: ProjectViewModel) -> some View {
        let today = sessionDateFormatter.string(from: Date())
        let sorted = vm.sessions.sorted { $0.date > $1.date }

        ForEach(sorted) { session in
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(formattedDate(session.date))
                        .font(.subheadline.bold())
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let score = session.score {
                        scoreBadge(score: score)
                    }
                }
                .padding(.horizontal)

                VStack(spacing: 0) {
                    ForEach(session.microActions) { action in
                        let isToday = session.date == today
                        if isToday {
                            MicroActionRowView(action: action) { completed in
                                Task {
                                    await vm.toggleMicroAction(
                                        sessionDate: session.date,
                                        actionId: action.id,
                                        isCompleted: completed
                                    )
                                }
                            }
                            .padding(.horizontal)
                        } else {
                            HStack(spacing: 12) {
                                Image(systemName: action.isCompleted ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(action.isCompleted ? Color.accentColor : Color.secondary)
                                    .font(.title3)
                                Text(action.title)
                                    .strikethrough(action.isCompleted)
                                    .foregroundStyle(.secondary)
                                Spacer()
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 4)
                        }
                    }
                }
                .padding(.vertical, 8)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }
        }
    }

    private func formattedDate(_ dateStr: String) -> String {
        guard let date = sessionDateFormatter.date(from: dateStr) else { return dateStr }
        return dateFormatter.string(from: date)
    }

    @ViewBuilder
    private func scoreCircle(score: Int) -> some View {
        ZStack {
            Circle()
                .fill(scoreColor(score))
                .frame(width: 32, height: 32)
            Text("\(score)")
                .font(.caption.bold())
                .foregroundStyle(.white)
        }
    }

    @ViewBuilder
    private func scoreBadge(score: Int) -> some View {
        scoreCircle(score: score)
    }

    private func scoreColor(_ score: Int) -> Color {
        if score >= 7 { return .green }
        if score >= 4 { return .orange }
        return .red
    }
}
