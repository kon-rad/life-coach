import SwiftUI

struct OnboardingCoordinatorView: View {
    @Environment(AppState.self) private var appState
    @State private var step: Int = 0

    var body: some View {
        switch step {
        case 0:
            WelcomeView(onNext: { step = 1 })
        case 1:
            PrivacyView(onNext: { step = 2 })
        case 2:
            SignInView(onSignedIn: { step = 3 })
        case 3:
            AboutYouView(
                title: "About you",
                subtitle: "Tell your coach a bit about you so every check-in feels personal. You can skip and add this later.",
                ctaTitle: "Continue",
                showSkip: true,
                onDone: { step = 4 },
                onSkip: { step = 4 }
            )
        default:
            HowItWorksView(onComplete: {
                Task { await completeOnboarding() }
            })
        }
    }

    private func completeOnboarding() async {
        let granted = await NotificationService.shared.requestPermission()
        if granted {
            NotificationService.shared.scheduleCheckInReminders(
                middayHour: 11, middayMinute: 30,
                eveningHour: 20, eveningMinute: 0
            )
            NotificationService.shared.scheduleStreakReminder(enabled: true)
        }
        UserDefaults.standard.set(true, forKey: "isOnboardingComplete")
        appState.isOnboardingComplete = true
    }
}
