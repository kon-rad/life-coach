import SwiftUI

// MARK: - Color Tokens

extension Color {
    // Backgrounds
    static let lcBackground = Color(red: 0.039, green: 0.039, blue: 0.047)    // #0A0A0C
    static let lcSurface    = Color(red: 0.075, green: 0.075, blue: 0.086)    // #131316
    static let lcSunken     = Color(red: 0.110, green: 0.110, blue: 0.125)    // #1C1C20

    // Accent
    static let lcAccent     = Color(red: 0.310, green: 0.365, blue: 1.000)    // #4f5dff
    static let lcAccentSoft = Color(red: 0.310, green: 0.365, blue: 1.000).opacity(0.15)
    static let lcAccentSofter = Color(red: 0.310, green: 0.365, blue: 1.000).opacity(0.08)

    // Text
    static let lcText       = Color(red: 0.961, green: 0.961, blue: 0.969)    // #F5F5F7
    static let lcTextDim    = Color.white.opacity(0.62)
    static let lcTextFaint  = Color.white.opacity(0.36)

    // Hairlines
    static let lcHairline       = Color.white.opacity(0.08)
    static let lcHairlineStrong = Color.white.opacity(0.14)

    // Semantic
    static let lcGreen  = Color(red: 0.204, green: 0.780, blue: 0.349)        // #34c759
    static let lcAmber  = Color(red: 1.000, green: 0.702, blue: 0.251)        // #ffb340
    static let lcRed    = Color(red: 1.000, green: 0.271, blue: 0.227)        // #ff453a

    static func lcScoreColor(_ score: Double) -> Color {
        if score >= 7 { return .lcGreen }
        if score >= 4 { return .lcAmber }
        return .lcRed
    }
}

// MARK: - Card

struct LCCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = 20

    init(padding: CGFloat = 20, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.padding = padding
    }

    var body: some View {
        content
            .padding(padding)
            .background(Color.lcSurface)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(Color.lcHairline, lineWidth: 0.5)
            )
    }
}

// MARK: - Primary Button

struct LCPrimaryButton: View {
    let title: String
    let action: () -> Void
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 17, weight: .semibold, design: .default))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
        }
        .background(isDisabled ? Color.lcAccent.opacity(0.45) : Color.lcAccent)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: Color.lcAccent.opacity(0.4), radius: 12, y: 6)
        .disabled(isDisabled)
    }
}

// MARK: - Section Label

struct LCSectionLabel: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Color.lcTextFaint)
            .tracking(0.6)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Animated Waveform (Canvas + TimelineView)

struct LCWaveform: View {
    var isActive: Bool
    var color: Color = .lcAccent
    var barCount: Int = 9

    var body: some View {
        if isActive {
            TimelineView(.animation) { tl in
                WaveformBars(date: tl.date, color: color, barCount: barCount, active: true)
            }
        } else {
            WaveformBars(date: .now, color: color, barCount: barCount, active: false)
        }
    }
}

private struct WaveformBars: View {
    let date: Date
    let color: Color
    let barCount: Int
    let active: Bool

    private let barWidth: CGFloat = 4
    private let barSpacing: CGFloat = 5
    private let minBarH: CGFloat = 5
    private let maxBarH: CGFloat = 56

    var body: some View {
        Canvas { ctx, size in
            let totalW = CGFloat(barCount) * barWidth + CGFloat(barCount - 1) * barSpacing
            let startX = (size.width - totalW) / 2
            let t = active ? date.timeIntervalSinceReferenceDate : 0

            for i in 0..<barCount {
                let x = startX + CGFloat(i) * (barWidth + barSpacing)
                let phase = t * 2.2 + Double(i) * 0.65
                let fraction = active ? abs(sin(phase)) * 0.85 + 0.15 : 0.12
                let h = minBarH + (maxBarH - minBarH) * fraction
                let y = (size.height - h) / 2
                let rect = CGRect(x: x, y: y, width: barWidth, height: h)
                let path = Path(roundedRect: rect, cornerRadius: 2)
                ctx.fill(path, with: .color(color))
            }
        }
        .frame(height: maxBarH + 16)
    }
}

// MARK: - Check Row (micro-action)

struct LCCheckRow: View {
    let label: String
    var hint: String? = nil
    let isChecked: Bool
    let onToggle: () -> Void
    var isLast: Bool = false

    var body: some View {
        Button(action: onToggle) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    Circle()
                        .stroke(isChecked ? Color.lcAccent : Color.lcHairlineStrong, lineWidth: 1.5)
                        .frame(width: 24, height: 24)
                    if isChecked {
                        Circle()
                            .fill(Color.lcAccent)
                            .frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .padding(.top, 1)

                VStack(alignment: .leading, spacing: 3) {
                    Text(label)
                        .font(.system(size: 15.5, weight: .medium))
                        .foregroundStyle(isChecked ? Color.lcText.opacity(0.45) : Color.lcText)
                        .strikethrough(isChecked, color: Color.lcText.opacity(0.45))
                        .multilineTextAlignment(.leading)

                    if let hint {
                        Text(hint)
                            .font(.system(size: 13))
                            .foregroundStyle(Color.lcTextDim.opacity(isChecked ? 0.5 : 1))
                    }
                }

                Spacer()
            }
            .padding(.vertical, 16)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            if !isLast {
                Color.lcHairline.frame(height: 0.5)
            }
        }
    }
}
