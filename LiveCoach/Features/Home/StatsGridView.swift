import SwiftUI

struct StatsGridView: View {
    let stats: UserStats

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            StatCellView(icon: "flame.fill", value: "\(stats.currentStreak)", label: "Day Streak")
            StatCellView(icon: "checkmark.seal.fill", value: "\(stats.totalDaysComplete)", label: "Days Complete")
            StatCellView(icon: "list.bullet.circle.fill", value: "\(stats.totalMicroActionsDone)", label: "Total Actions")
            StatCellView(icon: "mic.fill", value: "\(stats.totalVoiceSecondsUsed / 60)", label: "Voice Minutes")
            StatCellView(icon: "bubble.left.fill", value: "\(stats.totalChatMessages)", label: "Chat Messages")
            StatCellView(
                icon: "star.fill",
                value: stats.averageScore.map { String(format: "%.1f", $0) } ?? "—",
                label: "Avg Score"
            )
        }
    }
}

private struct StatCellView: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title2)
                .bold()
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
