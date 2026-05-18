import SwiftUI

struct OnboardingCoordinatorView: View {
    @Environment(AppState.self) private var appState
    @State private var step: Int = 0
    @State private var goalText: String = ""

    var body: some View {
        switch step {
        case 0:
            WelcomeView(onNext: { step = 1 })
        case 1:
            PrivacyView(onNext: { step = 2 })
        case 2:
            SignInView(onSignedIn: { step = 3 })
        case 3:
            GoalInputView(onGoalSubmitted: { goal in
                goalText = goal
                step = 4
            })
        default:
            HowItWorksView(onComplete: {
                Task { await completeOnboarding() }
            })
        }
    }

    private func completeOnboarding() async {
        struct ProjectBody: Encodable {
            let title: String
            let description: String
        }
        let body = ProjectBody(title: goalText, description: "")
        _ = try? await ProxyAPIClient.shared.post("/project", body: body) as Project
        UserDefaults.standard.set(true, forKey: "isOnboardingComplete")
        appState.isOnboardingComplete = true
    }
}
