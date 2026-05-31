import SwiftUI

struct PrivacyView: View {
    let onNext: () -> Void

    private let bullets: [(title: String, detail: String)] = [
        ("End-to-end encrypted",   "Your conversations are encrypted on-device and in transit."),
        ("No identity required",   "We don't ask for your name. The AI doesn't know who you are."),
        ("Delete anytime",         "Wipe your history in one tap. We keep nothing after."),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Shield illustration
            ZStack {
                Circle()
                    .fill(Color.lcAccent.opacity(0.08))
                    .frame(width: 144, height: 144)
                Image(systemName: "lock.shield")
                    .font(.system(size: 60, weight: .light))
                    .foregroundStyle(Color.lcAccent)
            }
            .padding(.top, 32)
            .padding(.bottom, 32)

            VStack(alignment: .leading, spacing: 0) {
                Text("Private by design.")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                    .tracking(-0.8)
                    .padding(.bottom, 12)

                Text("The deepest conversations need the strongest privacy. Here's how we protect yours.")
                    .font(.system(size: 16))
                    .foregroundStyle(Color.lcTextDim)
                    .tracking(-0.2)
                    .lineSpacing(4)
                    .padding(.bottom, 28)

                VStack(alignment: .leading, spacing: 18) {
                    ForEach(bullets, id: \.title) { bullet in
                        HStack(alignment: .top, spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(Color.lcAccentSoft)
                                    .frame(width: 28, height: 28)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(Color.lcAccent)
                            }
                            .padding(.top, 1)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(bullet.title)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(Color.lcText)
                                    .tracking(-0.2)
                                Text(bullet.detail)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Color.lcTextDim)
                                    .tracking(-0.1)
                                    .lineSpacing(3)
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            LCPrimaryButton(title: "Continue", action: onNext)
                .padding(.bottom, 8)
        }
        .padding(.horizontal, 28)
        .background(Color.lcBackground)
    }
}
