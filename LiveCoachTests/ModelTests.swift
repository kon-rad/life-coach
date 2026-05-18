import XCTest
@testable import LiveCoach

final class ModelTests: XCTestCase {
    func testMicroActionRoundTrip() throws {
        let action = MicroAction(id: "test-id", title: "Test action", isCompleted: true, completedAt: nil)
        let data = try JSONEncoder().encode(action)
        let decoded = try JSONDecoder().decode(MicroAction.self, from: data)
        XCTAssertEqual(decoded.id, action.id)
        XCTAssertEqual(decoded.title, action.title)
        XCTAssertEqual(decoded.isCompleted, action.isCompleted)
    }

    func testDailySessionRoundTrip() throws {
        let action1 = MicroAction(id: "a1", title: "Action 1", isCompleted: false, completedAt: nil)
        let action2 = MicroAction(id: "a2", title: "Action 2", isCompleted: true, completedAt: nil)
        let session = DailySession(
            id: "user1_2026-05-19",
            userId: "user1",
            date: "2026-05-19",
            microActions: [action1, action2],
            morningCallId: nil,
            eveningCallId: nil,
            score: nil,
            scoreRationale: nil,
            tomorrowMicroActions: nil
        )
        let data = try JSONEncoder().encode(session)
        let decoded = try JSONDecoder().decode(DailySession.self, from: data)
        XCTAssertEqual(decoded.id, session.id)
        XCTAssertEqual(decoded.microActions.count, 2)
        XCTAssertEqual(decoded.microActions[1].id, "a2")
    }

    func testConversationTypeRawValue() {
        XCTAssertEqual(ConversationType.morningCall.rawValue, "morningCall")
    }

    func testMessageRoleRawValue() {
        XCTAssertEqual(MessageRole.user.rawValue, "user")
    }

    func testDailyQuotesCount() {
        XCTAssertEqual(Constants.DailyQuotes.all.count, 20)
    }
}
