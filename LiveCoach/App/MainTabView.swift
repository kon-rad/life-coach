import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @State private var sessionService = SessionService()
    @State private var subscriptionService = SubscriptionService()
    @State private var isDataLoading = true
    private let api = ProxyAPIClient.shared

    var body: some View {
        Group {
            if isDataLoading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                TabView {
                    HomeView()
                        .tabItem { Label("Home", systemImage: "house.fill") }
                    ProjectView()
                        .tabItem { Label("Project", systemImage: "target") }
                    CallsView()
                        .tabItem { Label("Calls", systemImage: "mic.fill") }
                    ProfileView()
                        .tabItem { Label("Profile", systemImage: "person.fill") }
                }
                .environment(sessionService)
            }
        }
        .task {
            defer { isDataLoading = false }
            guard !DemoMode.isEnabled else { return }
            do {
                appState.currentUser = try await api.get("/user/profile")
            } catch {
                appState.setError(error)
                return
            }
            async let projectLoad: Project? = try? api.get("/project")
            async let statsLoad: UserStats? = try? api.get("/user/stats")
            appState.currentProject = await projectLoad
            if let stats = await statsLoad {
                appState.userStats = stats
            }
            do {
                try await subscriptionService.fetchStatus()
                appState.isPremium = subscriptionService.isPremium ||
                    (appState.userStats?.voiceMinutesRemainingThisWeek ?? 0) > 0
            } catch {}
        }
    }
}
