import Foundation

struct WeekTask: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

enum WeekStatus: String, Codable, Sendable {
    case planned, active, complete
}

struct Week: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let weekNumber: Int
    let year: Int
    let startDate: String
    let endDate: String
    var tasks: [WeekTask]
    var status: WeekStatus
    var retrospectiveId: String?
    let createdAt: Date
}
