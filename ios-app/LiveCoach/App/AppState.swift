import SwiftUI

@MainActor
@Observable final class AppState {
    var currentUser: User?
    var todaySession: DailySession?
    var userStats: UserStats?
    var isOnboardingComplete: Bool = false
    var isPremium: Bool = false
    var isLoading: Bool = false
    var errorMessage: String?

    func setError(_ error: Error?) {
        errorMessage = error?.localizedDescription
    }

    func clearAll() {
        currentUser = nil
        todaySession = nil
        userStats = nil
        isPremium = false
        errorMessage = nil
    }
}
