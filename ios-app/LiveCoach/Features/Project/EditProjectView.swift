import SwiftUI

struct EditProjectView: View {
    @Environment(\.dismiss) private var dismiss
    let project: Project
    let projectService: ProjectService

    @State private var titleText: String
    @State private var isUpdating = false
    @State private var error: Error?

    init(project: Project, projectService: ProjectService) {
        self.project = project
        self.projectService = projectService
        _titleText = State(initialValue: project.title)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("My goal", text: $titleText, axis: .vertical)
                        .lineLimit(3...6)
                        .onChange(of: titleText) { _, new in
                            if new.count > 100 { titleText = String(new.prefix(100)) }
                        }
                    Text("\(titleText.count)/100")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Goal")
                }

                Section {
                    Text(project.description.isEmpty ? "AI description will appear here after update." : project.description)
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                } header: {
                    Text("AI description preview")
                }

                if let error {
                    Section {
                        Text(error.localizedDescription)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Update Goal") {
                        Task { await update() }
                    }
                    .disabled(titleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isUpdating)
                }
            }
            .overlay {
                if isUpdating { ProgressView() }
            }
        }
    }

    private func update() async {
        isUpdating = true
        error = nil
        defer { isUpdating = false }
        do {
            _ = try await projectService.update(id: project.id, title: titleText.trimmingCharacters(in: .whitespacesAndNewlines))
            dismiss()
        } catch let e {
            error = e
        }
    }
}
