import Foundation

/// Loads and saves the user's up-to-3 long-term goals via the proxy. Mirrors the
/// `WeekService` pattern (created directly, not environment-injected). The proxy
/// stores goals encrypted on the user doc and replaces the whole set on each save.
@MainActor
@Observable final class GoalService {
    var goals: [Goal] = []
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do {
            let resp: GoalsResponse = try await api.get("/user/goals")
            goals = resp.goals
        } catch {
            self.error = error
        }
    }

    /// Replaces the entire goal set. Returns the server-normalized goals (empty
    /// titles dropped, capped at 3, ids assigned).
    @discardableResult
    func save(_ newGoals: [Goal]) async throws -> [Goal] {
        struct Body: Encodable { let goals: [Goal] }
        let resp: GoalsResponse = try await api.put("/user/goals", body: Body(goals: newGoals))
        goals = resp.goals
        return resp.goals
    }
}
