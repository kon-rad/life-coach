import SwiftUI

/// Date + score formatting shared across the Tasks view cards.
enum TasksFormat {
    private static let iso: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static func format(_ isoDate: String, _ pattern: String) -> String {
        guard let date = iso.date(from: isoDate) else { return isoDate }
        let f = DateFormatter()
        f.locale = Locale.current
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = pattern
        return f.string(from: date)
    }

    /// e.g. "Monday"
    static func weekday(_ isoDate: String) -> String { format(isoDate, "EEEE") }
    /// e.g. "Jun 2"
    static func monthDay(_ isoDate: String) -> String { format(isoDate, "MMM d") }

    /// Average of the present (non-nil) day scores, or nil if none scored yet.
    static func averageScore(_ scores: [Int?]) -> Double? {
        let present = scores.compactMap { $0 }
        guard !present.isEmpty else { return nil }
        return Double(present.reduce(0, +)) / Double(present.count)
    }

    /// Today's date as a UTC `yyyy-MM-dd` string, matching the date strings the proxy
    /// writes for sessions/weeks (the server works in UTC). Use this to locate "today".
    static var todayISO: String { iso.string(from: Date()) }

    /// Half-open [from, to) UTC ISO-8601 timestamp window covering a single `yyyy-MM-dd`,
    /// for querying that day's conversations by `createdAt`.
    static func dayTimestampBounds(_ isoDate: String) -> (from: String, to: String) {
        let from = "\(isoDate)T00:00:00.000Z"
        guard let date = iso.date(from: isoDate) else {
            return (from: from, to: "\(isoDate)T23:59:59.999Z")
        }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let next = cal.date(byAdding: .day, value: 1, to: date) ?? date
        return (from: from, to: "\(iso.string(from: next))T00:00:00.000Z")
    }

    /// All inclusive `yyyy-MM-dd` dates from `start` to `end` (a full week is 7). Falls
    /// back to just `start` if the range can't be parsed.
    static func datesInRange(from start: String, to end: String) -> [String] {
        guard let s = iso.date(from: start), let e = iso.date(from: end), s <= e else { return [start] }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var out: [String] = []
        var d = s
        while d <= e {
            out.append(iso.string(from: d))
            guard let next = cal.date(byAdding: .day, value: 1, to: d) else { break }
            d = next
        }
        return out
    }
}

/// Small rounded "N/10" pill, colored by score (green/amber/red), or "—" when unscored.
struct ScoreBadge: View {
    let score: Double?
    var body: some View {
        let color = score.map { Color.lcScoreColor($0) } ?? Color.lcTextFaint
        HStack(spacing: 3) {
            Text(score.map { String(format: "%g", ($0 * 10).rounded() / 10) } ?? "—")
                .font(.system(size: 14, weight: .bold))
            Text("/10")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(color.opacity(0.7))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(color.opacity(0.14))
        .clipShape(Capsule())
    }
}
