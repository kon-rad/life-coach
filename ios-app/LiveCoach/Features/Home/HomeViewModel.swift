import Foundation

@MainActor
@Observable final class HomeViewModel {
    var todaySession: DailySession?
    var userStats: UserStats?
    var dailyQuote: String = ""
    var isLoading = false
    var error: Error?

    private let sessionService: SessionService
    private let api = ProxyAPIClient.shared
    private let appState: AppState?

    init(sessionService: SessionService, appState: AppState? = nil) {
        self.sessionService = sessionService
        self.appState = appState
    }

    func load() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        dailyQuote = Constants.DailyQuotes.quote(for: Date())
        if DemoMode.isEnabled {
            todaySession = DemoMode.todaySession
            userStats = DemoMode.userStats
            return
        }
        await sessionService.loadToday()
        todaySession = sessionService.todaySession
        do {
            let stats: UserStats = try await api.get("/user/stats")
            userStats = stats
            appState?.userStats = stats
        } catch {
            self.error = error
            appState?.setError(error)
        }
    }

    func toggleMicroAction(_ action: MicroAction, isCompleted: Bool) async {
        guard let sessionDate = todaySession?.date else { return }
        do {
            try await sessionService.toggleMicroAction(
                sessionDate: sessionDate,
                actionId: action.id,
                isCompleted: isCompleted
            )
            todaySession = sessionService.todaySession
        } catch {
            self.error = error
        }
    }

    var isMorningCallDone: Bool { todaySession?.morningCallId != nil }
    var isEveningCallDone: Bool { todaySession?.eveningCallId != nil }
    var shouldShowMorningCTA: Bool { !isMorningCallDone && Calendar.current.component(.hour, from: Date()) < 14 }
    var shouldShowEveningCTA: Bool { !isEveningCallDone && Calendar.current.component(.hour, from: Date()) >= 14 }
    var displayScore: Double? { userStats?.averageScore }
    var todayScore: Int? { todaySession?.score }
}
