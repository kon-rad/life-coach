import SwiftUI

struct RootView: View {
    @Environment(AppState.self) var appState

    var body: some View {
        Group {
            if appState.isOnboardingComplete {
                MainTabView()
            } else {
                OnboardingCoordinatorView()
            }
        }
        .onAppear {
            appState.isOnboardingComplete = UserDefaults.standard.bool(forKey: "isOnboardingComplete")
        }
    }
}
