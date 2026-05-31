import Foundation

@MainActor
@Observable final class WeekService {
    var weeks: [Week] = []
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do { weeks = try await api.get("/weeks") }
        catch { self.error = error }
    }

    var currentWeek: Week? {
        weeks.first { $0.status == .active } ?? weeks.first
    }

    func toggleWeekTask(weekKey: String, taskId: String, isCompleted: Bool) async throws {
        struct Body: Encodable { let isCompleted: Bool }
        let updated: Week = try await api.put(
            "/weeks/\(weekKey)/tasks/\(taskId)/complete", body: Body(isCompleted: isCompleted)
        )
        if let idx = weeks.firstIndex(where: { $0.id == updated.id }) { weeks[idx] = updated }
    }
}
