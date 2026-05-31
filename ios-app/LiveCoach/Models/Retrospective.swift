import Foundation

struct Retrospective: Codable, Identifiable, Sendable {
    let id: String
    let weekId: String
    let weekNumber: Int
    let year: Int
    let startDate: String
    let endDate: String
    var wentWell: String
    var improve: String
    var onePercent: String
    var summary: String
    let createdAt: Date
}
