import SwiftUI

// StatsGridView is no longer used in HomeView (replaced with inline stat cards).
// Kept for reference; will be removed in a future cleanup.
struct StatsGridView: View {
    let stats: UserStats

    var body: some View {
        HStack(spacing: 10) {
            statCard(label: "Streak", value: "\(stats.currentStreak)", unit: "days")
            statCard(label: "Avg score",
                     value: stats.averageScore.map { String(format: "%.1f", $0) } ?? "—",
                     unit: "7-day")
        }
    }

    private func statCard(label: String, value: String, unit: String) -> some View {
        LCCard(padding: 0) {
            VStack(alignment: .leading, spacing: 8) {
                LCSectionLabel(title: label).padding(0)
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text(value)
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-1)
                        .monospacedDigit()
                    Text(unit)
                        .font(.system(size: 13))
                        .foregroundStyle(Color.lcTextDim)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
