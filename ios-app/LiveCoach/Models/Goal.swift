import Foundation

/// A user's long-term goal. `description` and `dueDate` are empty strings when unset
/// (the proxy always returns them as strings, never absent), so they decode as
/// non-optional `String` without the "data couldn't be read" failure mode.
struct Goal: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var description: String
    /// ISO `yyyy-MM-dd`, or "" when no target date.
    var dueDate: String
}

/// Wrapper for the `/user/goals` GET/PUT payloads (`{ "goals": [...] }`).
struct GoalsResponse: Codable, Sendable {
    let goals: [Goal]
}
