import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) var appState

    var body: some View {
        NavigationStack {
            List {
                voiceMinutesSection
            }
            .navigationTitle("Profile")
        }
    }

    private var voiceMinutesSection: some View {
        Section("Voice") {
            let secondsUsed = appState.userStats?.totalVoiceSecondsUsed ?? 0
            let minutesUsed = secondsUsed / 60
            let minutesRemaining = appState.userStats?.voiceMinutesRemainingThisWeek ?? 0

            HStack {
                Text("🎙 \(minutesUsed) / 60 minutes used this week")
                    .font(.subheadline)
            }

            if minutesRemaining < 10 {
                VoiceMinutesBanner(minutesRemaining: minutesRemaining)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }
        }
    }
}
