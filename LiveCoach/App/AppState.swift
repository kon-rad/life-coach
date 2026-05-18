import SwiftUI

@MainActor
@Observable final class AppState {
    var currentUser: User?
    var currentProject: Project?
    var todaySession: DailySession?
    var userStats: UserStats?
    var isOnboardingComplete: Bool = false
    var isPremium: Bool = false
    var isLoading: Bool = false
    var errorMessage: String?
}
