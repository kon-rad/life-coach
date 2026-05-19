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

        // Poll for AI-generated description (up to 10 s, 2 s intervals)
        for _ in 0..<5 {
            try? await Task.sleep(for: .seconds(2))
            if let project = try? await ProxyAPIClient.shared.get("/project") as Project,
               !project.description.isEmpty {
                appState.currentProject = project
                break
            }
        }
        if appState.currentProject == nil,
           let project = try? await ProxyAPIClient.shared.get("/project") as Project {
            appState.currentProject = project
        }

        let granted = await NotificationService.shared.requestPermission()
        if granted {
            NotificationService.shared.scheduleCheckInReminders(
                morningHour: 8, morningMinute: 0,
                eveningHour: 21, eveningMinute: 0
            )
            NotificationService.shared.scheduleStreakReminder(enabled: true)
        }
        UserDefaults.standard.set(true, forKey: "isOnboardingComplete")
        appState.isOnboardingComplete = true
    }
}
