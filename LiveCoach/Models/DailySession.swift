import Foundation

struct MicroAction: Codable, Identifiable, Sendable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

struct DailySession: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let date: String
    var microActions: [MicroAction]
    var morningCallId: String?
    var eveningCallId: String?
    var score: Int?
    var scoreRationale: String?
    var tomorrowMicroActions: [MicroAction]?
}
