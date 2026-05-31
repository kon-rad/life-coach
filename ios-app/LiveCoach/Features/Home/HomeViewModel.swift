import Foundation

@MainActor
@Observable final class HomeViewModel {
    var todaySession: DailySession?
    var userStats: UserStats?
    var dailyQuote: String = ""
    var isLoading = false
    var error: Error?

    private let sessionService: SessionService
    private let weekService: WeekService
    private let api = ProxyAPIClient.shared
    private let appState: AppState?

    init(sessionService: SessionService, appState: AppState? = nil) {
        self.sessionService = sessionService
        self.weekService = WeekService()
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
        await weekService.load()
        do {
            let stats: UserStats = try await api.get("/user/stats")
            userStats = stats
            appState?.userStats = stats
        } catch {
            self.error = error
            appState?.setError(error)
        }
    }

    func toggleDayTask(_ task: DayTask, isCompleted: Bool) async {
        guard let sessionDate = todaySession?.date else { return }
        do {
            try await sessionService.toggleDayTask(
                sessionDate: sessionDate,
                taskId: task.id,
                isCompleted: isCompleted
            )
            todaySession = sessionService.todaySession
        } catch {
            self.error = error
        }
    }

    var currentWeekTasks: [WeekTask] { weekService.currentWeek?.tasks ?? [] }
    var isMiddayCallDone: Bool { todaySession?.middayCallId != nil }
    var isEveningCallDone: Bool { todaySession?.eveningCallId != nil }
    var shouldShowMiddayCTA: Bool { !isMiddayCallDone && Calendar.current.component(.hour, from: Date()) < 14 }
    var shouldShowEveningCTA: Bool { !isEveningCallDone && Calendar.current.component(.hour, from: Date()) >= 14 }
    var selectedCallType: CoachCallType { shouldShowMiddayCTA ? .midday : .evening }
    var displayScore: Double? { userStats?.averageScore }
    var todayScore: Int? { todaySession?.score }
}
