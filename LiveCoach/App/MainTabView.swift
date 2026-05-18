import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @State private var sessionService = SessionService()
    private let api = ProxyAPIClient.shared

    var body: some View {
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
        .task {
            do {
                appState.currentUser = try await api.get("/user/profile")
            } catch {}
            guard appState.currentUser != nil else { return }
            do {
                appState.currentProject = try await api.get("/project")
            } catch {}
        }
    }
}
