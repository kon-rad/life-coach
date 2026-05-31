import Foundation

@MainActor
@Observable final class SessionService {
    var todaySession: DailySession?
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    func loadToday() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        let dateString = dateFormatter.string(from: Date())
        do {
            todaySession = try await api.get("/sessions/\(dateString)")
        } catch {
            self.error = error
        }
    }

    func loadHistory(from: Date, to: Date) async throws -> [DailySession] {
        let fromStr = dateFormatter.string(from: from)
        let toStr = dateFormatter.string(from: to)
        return try await api.get("/sessions?from=\(fromStr)&to=\(toStr)")
    }

    func toggleMicroAction(sessionDate: String, actionId: String, isCompleted: Bool) async throws {
        struct ToggleBody: Encodable { let isCompleted: Bool }
        struct ToggleResponse: Decodable {}
        let _: ToggleResponse = try await api.put(
            "/sessions/\(sessionDate)/microactions/\(actionId)/complete",
            body: ToggleBody(isCompleted: isCompleted)
        )
        guard var session = todaySession, session.date == sessionDate else { return }
        if let idx = session.microActions.firstIndex(where: { $0.id == actionId }) {
            session.microActions[idx].isCompleted = isCompleted
            session.microActions[idx].completedAt = isCompleted ? Date() : nil
        }
        todaySession = session
    }
}
