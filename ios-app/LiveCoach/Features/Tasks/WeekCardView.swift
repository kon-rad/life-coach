import SwiftUI

struct WeekCardView: View {
    let week: Week
    let days: [DailySession]            // sessions whose weekId == week.id, sorted desc
    let isExpanded: Bool
    let onToggleWeekTask: (WeekTask) -> Void
    let onToggleDayTask: (DailySession, DayTask) -> Void

    private var weekKey: String { String(week.id.split(separator: "_").last ?? "") }

    var body: some View {
        LCCard {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Week \(week.weekNumber)")
                        .font(.system(size: 20, weight: .semibold)).foregroundStyle(Color.lcText)
                    Text("\(week.startDate) – \(week.endDate)")
                        .font(.system(size: 13)).foregroundStyle(Color.lcTextDim)
                }
                ForEach(week.tasks) { task in
                    CheckRow(title: task.title, isOn: task.isCompleted) { onToggleWeekTask(task) }
                }
                if isExpanded && !days.isEmpty {
                    Color.lcHairline.frame(height: 0.5)
                    ForEach(days) { day in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(day.date).font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.lcTextDim)
                            ForEach(day.tasks) { t in
                                CheckRow(title: t.title, isOn: t.isCompleted) { onToggleDayTask(day, t) }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct CheckRow: View {
    let title: String; let isOn: Bool; let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isOn ? Color.lcAccent : Color.lcTextFaint)
                Text(title).font(.system(size: 15)).foregroundStyle(Color.lcText)
                    .strikethrough(isOn).multilineTextAlignment(.leading)
                Spacer()
            }
        }.buttonStyle(.plain)
    }
}
