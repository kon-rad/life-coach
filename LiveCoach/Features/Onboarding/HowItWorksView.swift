import SwiftUI

struct HowItWorksView: View {
    let onComplete: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Here's your daily routine")
                    .font(.title)
                    .bold()
                    .padding(.top, 40)

                stepCard(number: "1", title: "Morning check-in (5 min)", description: "Plan your day and get your 3 micro-actions")
                stepCard(number: "2", title: "Complete your micro-actions", description: "Small steps that add up")
                stepCard(number: "3", title: "Evening check-in (5 min)", description: "Reflect, score, and set up tomorrow")

                VStack(alignment: .leading, spacing: 12) {
                    Text("Live Coach Premium")
                        .font(.headline)
                        .bold()
                    Text("$19.99/month or $149.99/year")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• Unlimited chat")
                        Text("• 60 voice minutes/week")
                        Text("• Daily accountability")
                    }
                    .font(.subheadline)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(spacing: 12) {
                    Button {
                        onComplete()
                    } label: {
                        Text("Start Premium ($19.99/mo)")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemIndigo))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        onComplete()
                    } label: {
                        Text("Try free")
                            .font(.headline)
                            .foregroundStyle(Color(.systemIndigo))
                            .frame(maxWidth: .infinity)
                            .padding()
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(.systemIndigo), lineWidth: 1)
                            )
                    }
                }
                .padding(.bottom, 40)
            }
            .padding(.horizontal)
        }
    }

    private func stepCard(number: String, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Text(number)
                .font(.title2)
                .bold()
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(Color(.systemIndigo))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
