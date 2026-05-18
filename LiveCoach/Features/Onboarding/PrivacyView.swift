import SwiftUI

struct PrivacyView: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Your conversations are yours alone.")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.top, 32)

                    Text("Live Coach uses end-to-end encryption. Your conversations, goals, and progress are encrypted with a key only you control. We store ciphertext — not your words.")
                        .font(.body)
                        .foregroundColor(.secondary)

                    VStack(alignment: .leading, spacing: 20) {
                        PrivacyRow(
                            icon: "checkmark.shield",
                            text: "Anonymous to AI — the AI never sees your name or email"
                        )
                        PrivacyRow(
                            icon: "lock.fill",
                            text: "Encrypted at rest — your Firebase data is unreadable without your key"
                        )
                        PrivacyRow(
                            icon: "hand.raised.slash",
                            text: "No selling, no training — your data is never used to train AI models"
                        )
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 24)
            }

            Button(action: onNext) {
                Text("Continue")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(Color.accentColor)
                    .cornerRadius(14)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
            .padding(.top, 16)
        }
        .background(.background)
    }
}

private struct PrivacyRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.accentColor)
                .frame(width: 32)
            Text(text)
                .font(.body)
        }
    }
}
