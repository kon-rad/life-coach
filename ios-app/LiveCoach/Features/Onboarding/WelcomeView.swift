import SwiftUI

struct WelcomeView: View {
    let onNext: () -> Void

    private let bullets = [
        "One goal. Weekly planning call.",
        "Midday check-in & evening debrief.",
        "A score that means something.",
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(alignment: .leading, spacing: 0) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.lcAccent)
                        .frame(width: 60, height: 60)
                        .shadow(color: Color.lcAccent.opacity(0.45), radius: 20, y: 8)
                    Image(systemName: "waveform")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .padding(.bottom, 32)

                Text("Soularc.")
                    .font(.system(size: 40, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                    .tracking(-1.2)
                    .padding(.bottom, 14)

                Text("Your AI life coach. Private by design.")
                    .font(.system(size: 19))
                    .foregroundStyle(Color.lcTextDim)
                    .tracking(-0.3)
                    .lineSpacing(5)
                    .padding(.bottom, 36)

                VStack(alignment: .leading, spacing: 16) {
                    ForEach(bullets, id: \.self) { bullet in
                        HStack(spacing: 14) {
                            Circle()
                                .fill(Color.lcAccent)
                                .frame(width: 6, height: 6)
                            Text(bullet)
                                .font(.system(size: 16))
                                .foregroundStyle(Color.lcText)
                                .tracking(-0.2)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            LCPrimaryButton(title: "Get Started", action: onNext)
                .padding(.bottom, 8)
        }
        .padding(.horizontal, 28)
        .background(Color.lcBackground)
    }
}
