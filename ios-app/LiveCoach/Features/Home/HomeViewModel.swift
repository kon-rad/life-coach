import Foundation

@MainActor
@Observable final class HomeViewModel {
    var todaySession: DailySession?
    var userStats: UserStats?
    /// Sessions for the current week (used for the week-so-far average + last day's score).
    var weekSessions: [DailySession] = []
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
            weekSessions = [DemoMode.todaySession]
            return
        }
        await sessionService.loadToday()
        todaySession = sessionService.todaySession
        await weekService.load()
        // Load the current week's sessions for the home score card (week avg + last day).
        if let week = weekService.currentWeek {
            weekSessions = (try? await sessionService.loadHistory(
                fromISO: week.startDate, toISO: week.endDate)) ?? []
        } else {
            weekSessions = []
        }
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

    /// The most recent scored day this week (falls back to today's score if present).
    var lastDayScore: Int? {
        let scored = weekSessions.filter { $0.score != nil }.sorted { $0.date > $1.date }
        return scored.first?.score ?? todaySession?.score
    }

    /// Average of the scored days so far this week, or nil if none scored yet.
    var weekAverageScore: Double? {
        TasksFormat.averageScore(weekSessions.map { $0.score })
    }
}
