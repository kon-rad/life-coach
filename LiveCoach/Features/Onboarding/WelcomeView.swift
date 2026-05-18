import SwiftUI

struct WelcomeView: View {
    let onNext: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(.systemIndigo), Color(.systemPurple)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 12) {
                    Text("Live Coach")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Your AI life coach. Private by design.")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.85))
                        .multilineTextAlignment(.center)
                }

                Spacer()

                VStack(alignment: .leading, spacing: 20) {
                    FeatureRow(icon: "mic.fill", text: "Daily 5-minute voice check-ins with your AI coach")
                    FeatureRow(icon: "checkmark.circle.fill", text: "Three micro-actions every day that move you forward")
                    FeatureRow(icon: "lock.shield.fill", text: "Your data is encrypted. We cannot read it.")
                }
                .padding(.horizontal, 32)

                Spacer()

                Button(action: onNext) {
                    Text("Get Started")
                        .font(.headline)
                        .foregroundColor(Color(.systemIndigo))
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white)
                        .cornerRadius(14)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 48)
            }
        }
    }
}

private struct FeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 32)
            Text(text)
                .font(.body)
                .foregroundColor(.white.opacity(0.9))
        }
    }
}
