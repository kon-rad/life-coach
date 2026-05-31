import Foundation

enum CoachingStyle: String, CaseIterable, Codable, Sendable, Identifiable {
    case tough
    case balanced
    case gentle

    var id: String { rawValue }

    var label: String {
        switch self {
        case .tough: return "Tough love"
        case .balanced: return "Balanced"
        case .gentle: return "Gentle"
        }
    }

    var blurb: String {
        switch self {
        case .tough: return "Blunt and accountable. No coddling."
        case .balanced: return "Warm but direct."
        case .gentle: return "Patient and encouraging."
        }
    }

    init(fromRaw raw: String) {
        self = CoachingStyle(rawValue: raw) ?? .balanced
    }
}

/// Mirrors the proxy `PUT /user/profile` body. Optional fields are omitted when nil,
/// matching the server's `if (field !== undefined)` merge semantics.
struct ProfileUpdate: Encodable, Sendable {
    var displayName: String?
    var bio: String?
    var coachingStyle: String?
    var occupation: String?
    var motivation: String?
}

private struct ProfileUpdateResponse: Decodable { let updated: Bool }

enum ProfileService {
    static func update(_ update: ProfileUpdate) async throws {
        _ = try await ProxyAPIClient.shared.put("/user/profile", body: update) as ProfileUpdateResponse
    }
}
