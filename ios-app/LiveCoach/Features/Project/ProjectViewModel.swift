import Foundation

@MainActor
@Observable final class ProjectViewModel {
    var project: Project?
    var sessions: [DailySession] = []
    var isLoading = false
    var error: Error?

    private let api = ProxyAPIClient.shared
    private let projectService: ProjectService

    init(projectService: ProjectService) {
        self.projectService = projectService
    }

    func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await projectService.load()
            project = projectService.activeProject
            let to = Date()
            let from = Calendar.current.date(byAdding: .day, value: -30, to: to) ?? to
            sessions = try await loadSessions(from: from, to: to)
        } catch {
            self.error = error
        }
    }

    private func loadSessions(from: Date, to: Date) async throws -> [DailySession] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        let fromStr = formatter.string(from: from)
        let toStr = formatter.string(from: to)
        return try await api.get("/sessions?from=\(fromStr)&to=\(toStr)")
    }

    func toggleMicroAction(sessionDate: String, actionId: String, isCompleted: Bool) async {
        do {
            struct ToggleBody: Encodable { let isCompleted: Bool }
            struct ToggleResponse: Decodable {}
            let _: ToggleResponse = try await api.put(
                "/sessions/\(sessionDate)/microactions/\(actionId)/complete",
                body: ToggleBody(isCompleted: isCompleted)
            )
            if let idx = sessions.firstIndex(where: { $0.date == sessionDate }) {
                if let aIdx = sessions[idx].microActions.firstIndex(where: { $0.id == actionId }) {
                    sessions[idx].microActions[aIdx].isCompleted = isCompleted
                    sessions[idx].microActions[aIdx].completedAt = isCompleted ? Date() : nil
                }
            }
        } catch {
            self.error = error
        }
    }
}
