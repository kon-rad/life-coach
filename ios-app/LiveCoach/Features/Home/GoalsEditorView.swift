import SwiftUI

/// Modal that edits all three long-term goals at once. Pre-fills from existing
/// goals, saves the full set in one action (empty-title rows are dropped server-side).
struct GoalsEditorView: View {
    @Environment(\.dismiss) private var dismiss

    private let onSave: ([Goal]) async -> Void
    @State private var drafts: [GoalDraft]
    @State private var isSaving = false

    init(initialGoals: [Goal], onSave: @escaping ([Goal]) async -> Void) {
        self.onSave = onSave
        _drafts = State(initialValue: GoalsEditorView.makeDrafts(from: initialGoals))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Text("Your top 3 goals shape every coaching call — the coach connects your weekly and daily tasks back to them.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcTextDim)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                        .padding(.top, 4)

                    ForEach($drafts) { $draft in
                        goalEditorCard($draft)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
            .background(Color.lcBackground)
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Goals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.lcTextDim)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { Task { await save() } }
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.lcAccent)
                        .disabled(isSaving)
                }
            }
        }
    }

    private func goalEditorCard(_ draft: Binding<GoalDraft>) -> some View {
        LCCard {
            VStack(alignment: .leading, spacing: 12) {
                LCSectionLabel(title: "Goal \(draft.wrappedValue.index + 1)")

                TextField("Goal title", text: draft.title, axis: .vertical)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.lcText)
                    .lineLimit(1...2)

                Color.lcHairline.frame(height: 0.5)

                TextField("Description (optional)", text: draft.description, axis: .vertical)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.lcText)
                    .lineLimit(1...4)

                Toggle(isOn: draft.hasDueDate) {
                    Text("Set a target date")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcTextDim)
                }
                .tint(Color.lcAccent)

                if draft.wrappedValue.hasDueDate {
                    DatePicker(
                        "Target date",
                        selection: draft.dueDate,
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .tint(Color.lcAccent)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.lcTextDim)
                }
            }
        }
    }

    private func save() async {
        guard !isSaving else { return }
        isSaving = true
        let goals = drafts.compactMap { $0.toGoal() }
        await onSave(goals)
        isSaving = false
        dismiss()
    }

    private static func makeDrafts(from goals: [Goal]) -> [GoalDraft] {
        (0..<3).map { i in
            i < goals.count ? GoalDraft(goal: goals[i], index: i) : GoalDraft(empty: i)
        }
    }
}

/// Mutable, view-local representation of a goal row (the date is a `Date` for the
/// picker; it's serialized back to a `yyyy-MM-dd` string on save).
struct GoalDraft: Identifiable {
    let id: String
    let index: Int
    var title: String
    var description: String
    var hasDueDate: Bool
    var dueDate: Date

    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    init(goal: Goal, index: Int) {
        self.id = goal.id
        self.index = index
        self.title = goal.title
        self.description = goal.description
        if !goal.dueDate.isEmpty, let d = GoalDraft.formatter.date(from: goal.dueDate) {
            self.hasDueDate = true
            self.dueDate = d
        } else {
            self.hasDueDate = false
            self.dueDate = Date()
        }
    }

    init(empty index: Int) {
        self.id = UUID().uuidString
        self.index = index
        self.title = ""
        self.description = ""
        self.hasDueDate = false
        self.dueDate = Date()
    }

    /// Returns nil when the title is blank, so blank rows are dropped (mirrors the
    /// server's normalization).
    func toGoal() -> Goal? {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return Goal(
            id: id,
            title: trimmed,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            dueDate: hasDueDate ? GoalDraft.formatter.string(from: dueDate) : ""
        )
    }
}
