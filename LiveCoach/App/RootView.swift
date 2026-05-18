import SwiftUI

struct RootView: View {
    @Environment(AppState.self) var appState

    var body: some View {
        if appState.isOnboardingComplete {
            Text("Main App")
        } else {
            Text("Onboarding")
        }
    }
}
