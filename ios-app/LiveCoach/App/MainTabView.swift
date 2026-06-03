import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @State private var sessionService = SessionService()
    @State private var subscriptionService = SubscriptionService()
    @State private var isDataLoading = true
    @State private var selectedTab = 0
    private let api = ProxyAPIClient.shared

    var body: some View {
        Group {
            if isDataLoading {
                ZStack {
                    Color.lcBackground.ignoresSafeArea()
                    ProgressView().tint(Color.lcAccent)
                }
            } else {
                NavigationStack {
                    TabView(selection: $selectedTab) {
                        HomeView()
                            .tag(0)
                            .tabItem { Label("Today", systemImage: "house") }

                        TasksView()
                            .tag(1)
                            .tabItem { Label("Tasks", systemImage: "checklist") }

                        CallsView()
                            .tag(2)
                            .tabItem { Label("Calls", systemImage: "waveform") }

                        ProfileView()
                            .tag(3)
                            .tabItem { Label("Profile", systemImage: "person") }
                    }
                    .navigationTitle(tabTitle)
                    .navigationBarTitleDisplayMode(.large)
                    .toolbar {
                        if selectedTab == 0 {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                HStack(spacing: 4) {
                                    Image(systemName: "lock")
                                        .font(.system(size: 10, weight: .semibold))
                                    Text("Private")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(0.4)
                                }
                                .foregroundStyle(Color.lcTextDim)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Color.lcSurface)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color.lcHairline, lineWidth: 0.5))
                            }
                        }
                    }
                    .environment(sessionService)
                    .environment(subscriptionService)
                }
                .preferredColorScheme(.dark)
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
            async let statsLoad: UserStats? = try? api.get("/user/stats")
            if let stats = await statsLoad {
                appState.userStats = stats
            }
            if Constants.devMode {
                appState.isPremium = true
                appState.hasActivePlan = true
            } else {
                // `tier` stays `.free` if the RevenueCat fetch fails; `apply` still folds
                // in the server-authoritative grant, so a redeemed coupon unlocks access
                // even when the on-device entitlement is missing. Always call `apply`.
                try? await subscriptionService.fetchStatus()
                appState.apply(tier: subscriptionService.tier)
            }
        }
    }

    private var tabTitle: String {
        switch selectedTab {
        case 0: return "Today"
        case 1: return "Tasks"
        case 2: return "Conversations"
        case 3: return "Settings"
        default: return ""
        }
    }
}
