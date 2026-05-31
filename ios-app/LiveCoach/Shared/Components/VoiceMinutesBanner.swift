import SwiftUI

struct VoiceMinutesBanner: View {
    let minutesRemaining: Int

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "mic.fill")
                .foregroundStyle(.orange)
            Text("\(minutesRemaining) voice minute\(minutesRemaining == 1 ? "" : "s") remaining this week")
                .font(.subheadline)
                .foregroundStyle(.primary)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
