import Foundation

struct Project: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    var title: String
    var description: String
    let createdAt: Date
    var isActive: Bool
}
