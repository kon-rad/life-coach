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

    func toggleDayTask(sessionDate: String, taskId: String, isCompleted: Bool) async throws {
        struct ToggleBody: Encodable { let isCompleted: Bool }
        let updated: DailySession = try await api.put(
            "/sessions/\(sessionDate)/tasks/\(taskId)/complete",
            body: ToggleBody(isCompleted: isCompleted)
        )
        if todaySession?.date == sessionDate { todaySession = updated }
    }
}
