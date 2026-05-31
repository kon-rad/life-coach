import SwiftUI

struct RootView: View {
    @Environment(AppState.self) var appState

    var body: some View {
        ZStack(alignment: .top) {
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

            if let msg = appState.errorMessage {
                ErrorBanner(message: msg) {
                    appState.errorMessage = nil
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(.easeInOut, value: appState.errorMessage)
                .zIndex(1)
            }
        }
    }
}
