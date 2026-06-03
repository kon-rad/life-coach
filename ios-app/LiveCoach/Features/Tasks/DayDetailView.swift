import SwiftUI

@MainActor
@Observable final class DayDetailViewModel {
    let date: String
    var session: DailySession?
    var calls: [Conversation] = []
    var isLoading = false
    var newTaskTitle = ""

    private let sessions = SessionService()
    private let api = ProxyAPIClient.shared

    init(date: String, seed: DailySession? = nil) {
        self.date = date
        self.session = seed
    }

    var tasks: [DayTask] { session?.tasks ?? [] }
    var doneCount: Int { tasks.filter { $0.isCompleted }.count }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        let bounds = TasksFormat.dayTimestampBounds(date)
        async let loadedSession = try? sessions.loadDay(date)
        async let loadedCalls: [Conversation]? =
            try? api.get("/conversations?from=\(bounds.from)&to=\(bounds.to)")
        if let s = await loadedSession { session = s }
        calls = (await loadedCalls) ?? []
    }

    func addTask() async {
        let title = newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }
        newTaskTitle = ""
        if let updated = try? await sessions.addDayTask(date: date, title: title) { session = updated }
    }

    func toggle(_ task: DayTask) async {
        if let updated = try? await sessions.editDayTask(
            date: date, taskId: task.id, isCompleted: !task.isCompleted) { session = updated }
    }

    func rename(_ task: DayTask, to title: String) async {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        if let updated = try? await sessions.editDayTask(
            date: date, taskId: task.id, title: trimmed) { session = updated }
    }

    func delete(_ task: DayTask) async {
        if let updated = try? await sessions.deleteDayTask(date: date, taskId: task.id) { session = updated }
    }
}

/// A single day: its (unbounded) tasks with manual add/edit/delete, the day's score +
/// summary + coach advice, and the calls that happened that day (each opens its detail).
struct DayDetailView: View {
    @State private var vm: DayDetailViewModel
    @State private var chatService = ChatService()
    @State private var renameTarget: DayTask?
    @State private var renameText = ""

    private let isToday: Bool

    init(date: String, seed: DailySession? = nil) {
        _vm = State(initialValue: DayDetailViewModel(date: date, seed: seed))
        self.isToday = date == TasksFormat.todayISO
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                tasksCard
                scoreCard
                callsCard
            }
            .padding(16)
        }
        .background(Color.lcBackground)
        .navigationTitle(TasksFormat.weekday(vm.date))
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .refreshable { await vm.load() }
        .alert("Rename task", isPresented: Binding(
            get: { renameTarget != nil },
            set: { if !$0 { renameTarget = nil } }
        )) {
            TextField("Task", text: $renameText)
            Button("Cancel", role: .cancel) { renameTarget = nil }
            Button("Save") {
                if let t = renameTarget { Task { await vm.rename(t, to: renameText) } }
                renameTarget = nil
            }
        }
    }

    // MARK: - Tasks

    private var tasksCard: some View {
        LCCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    LCSectionLabel(title: "\(TasksFormat.monthDay(vm.date)) · Tasks")
                    Spacer()
                    if !vm.tasks.isEmpty {
                        Text("\(vm.doneCount)/\(vm.tasks.count)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.lcTextDim)
                            .monospacedDigit()
                    }
                }

                if vm.tasks.isEmpty {
                    Text("No tasks for this day yet. Add one below, or set them in a check-in call.")
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.lcTextFaint)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(vm.tasks.enumerated()), id: \.element.id) { idx, task in
                            taskRow(task, isLast: idx == vm.tasks.count - 1)
                        }
                    }
                }

                addTaskRow
            }
        }
    }

    private func taskRow(_ task: DayTask, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Button { Task { await vm.toggle(task) } } label: {
                ZStack {
                    Circle()
                        .stroke(task.isCompleted ? Color.lcAccent : Color.lcHairlineStrong, lineWidth: 1.5)
                        .frame(width: 24, height: 24)
                    if task.isCompleted {
                        Circle().fill(Color.lcAccent).frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .padding(.top, 1)
            }
            .buttonStyle(.plain)

            Text(task.title)
                .font(.system(size: 15.5, weight: .medium))
                .foregroundStyle(task.isCompleted ? Color.lcText.opacity(0.45) : Color.lcText)
                .strikethrough(task.isCompleted, color: Color.lcText.opacity(0.45))
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            Menu {
                Button { renameText = task.title; renameTarget = task } label: {
                    Label("Rename", systemImage: "pencil")
                }
                Button(role: .destructive) { Task { await vm.delete(task) } } label: {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.lcTextFaint)
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5) }
        }
    }

    private var addTaskRow: some View {
        HStack(spacing: 10) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(Color.lcAccent)
            TextField("Add a task", text: $vm.newTaskTitle)
                .font(.system(size: 15))
                .foregroundStyle(Color.lcText)
                .submitLabel(.done)
                .onSubmit { Task { await vm.addTask() } }
        }
        .padding(.top, 4)
    }

    // MARK: - Score + summary + advice

    @ViewBuilder
    private var scoreCard: some View {
        LCCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .center) {
                    LCSectionLabel(title: "Day score")
                    Spacer()
                    if let score = vm.session?.score { ScoreBadge(score: Double(score)) }
                }

                if vm.session?.score == nil {
                    Text(isToday
                         ? "Scored after your evening check-in tonight."
                         : "No score — this day's evening check-in wasn't completed.")
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.lcTextFaint)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    if let summary = vm.session?.summary, !summary.isEmpty {
                        Text(summary)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.lcTextDim)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let advice = vm.session?.advice, !advice.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 8) {
                                Image(systemName: "lightbulb.fill")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.lcAccent)
                                Text("Coach's advice")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Color.lcAccent)
                            }
                            Text(advice)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.lcText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.lcAccentSofter)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    // MARK: - Calls

    private var callsCard: some View {
        LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                LCSectionLabel(title: "Calls & conversations")
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 4)

                if vm.calls.isEmpty {
                    Text("No calls or conversations on this day.")
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.lcTextFaint)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)
                } else {
                    ForEach(Array(vm.calls.enumerated()), id: \.element.id) { idx, convo in
                        NavigationLink {
                            ConversationDetailView(conversation: convo, chatService: chatService)
                        } label: {
                            callRow(convo, isLast: idx == vm.calls.count - 1)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.bottom, 4)
                }
            }
        }
    }

    private func callRow(_ convo: Conversation, isLast: Bool) -> some View {
        let isVoice = [ConversationType.middayCall, .eveningCall, .weeklyCall, .freeVoice].contains(convo.type)
        return HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.lcAccentSofter)
                    .frame(width: 40, height: 40)
                Image(systemName: isVoice ? "waveform" : "bubble.left")
                    .font(.system(size: 17))
                    .foregroundStyle(Color.lcAccent)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(callTypeLabel(convo.type))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                if let summary = convo.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.system(size: 13))
                        .foregroundStyle(Color.lcTextDim)
                        .lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.lcTextFaint)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5).padding(.leading, 20) }
        }
    }
}
