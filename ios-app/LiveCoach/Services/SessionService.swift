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

    /// History by `yyyy-MM-dd` strings (the proxy's UTC date contract). Prefer this when
    /// the bounds already come from server-provided date strings (e.g. a week's range).
    func loadHistory(fromISO: String, toISO: String) async throws -> [DailySession] {
        try await api.get("/sessions?from=\(fromISO)&to=\(toISO)")
    }

    func loadDay(_ date: String) async throws -> DailySession {
        try await api.get("/sessions/\(date)")
    }

    func toggleDayTask(sessionDate: String, taskId: String, isCompleted: Bool) async throws {
        struct ToggleBody: Encodable { let isCompleted: Bool }
        let updated: DailySession = try await api.put(
            "/sessions/\(sessionDate)/tasks/\(taskId)/complete",
            body: ToggleBody(isCompleted: isCompleted)
        )
        if todaySession?.date == sessionDate { todaySession = updated }
    }

    // MARK: - Day task editing (manual CRUD, mirrors the proxy endpoints)

    @discardableResult
    func addDayTask(date: String, title: String) async throws -> DailySession {
        struct Body: Encodable { let title: String }
        return try await api.post("/sessions/\(date)/tasks", body: Body(title: title))
    }

    @discardableResult
    func editDayTask(date: String, taskId: String, title: String? = nil, isCompleted: Bool? = nil) async throws -> DailySession {
        struct Body: Encodable { let title: String?; let isCompleted: Bool? }
        return try await api.put("/sessions/\(date)/tasks/\(taskId)", body: Body(title: title, isCompleted: isCompleted))
    }

    @discardableResult
    func deleteDayTask(date: String, taskId: String) async throws -> DailySession {
        try await api.delete("/sessions/\(date)/tasks/\(taskId)")
    }
}
