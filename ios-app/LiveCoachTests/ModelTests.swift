import XCTest
@testable import Soularc

final class ModelTests: XCTestCase {

    func testDayTaskRoundTrip() throws {
        let task = DayTask(id: "test-id", title: "Test task", isCompleted: true, completedAt: nil)
        let data = try JSONEncoder().encode(task)
        let decoded = try JSONDecoder().decode(DayTask.self, from: data)
        XCTAssertEqual(decoded.id, task.id)
        XCTAssertEqual(decoded.title, task.title)
        XCTAssertEqual(decoded.isCompleted, task.isCompleted)
    }

    func testDailySessionRoundTrip() throws {
        let task1 = DayTask(id: "a1", title: "Task 1", isCompleted: false, completedAt: nil)
        let task2 = DayTask(id: "a2", title: "Task 2", isCompleted: true, completedAt: nil)
        let session = DailySession(
            id: "user1_2026-05-19",
            userId: "user1",
            date: "2026-05-19",
            weekId: nil,
            tasks: [task1, task2],
            middayCallId: nil,
            eveningCallId: nil,
            score: nil,
            scoreRationale: nil
        )
        let data = try JSONEncoder().encode(session)
        let decoded = try JSONDecoder().decode(DailySession.self, from: data)
        XCTAssertEqual(decoded.id, session.id)
        XCTAssertEqual(decoded.tasks.count, 2)
        XCTAssertEqual(decoded.tasks[1].id, "a2")
    }

    func testConversationTypeRawValue() {
        XCTAssertEqual(ConversationType.middayCall.rawValue, "middayCall")
    }

    func testMessageRoleRawValue() {
        XCTAssertEqual(MessageRole.user.rawValue, "user")
    }

    func testDailyQuotesCount() {
        XCTAssertEqual(Constants.DailyQuotes.all.count, 20)
    }

    func testWeekDecodes() throws {
        let json = """
        {"id":"u_2026-W23","userId":"u","weekNumber":23,"year":2026,
         "startDate":"2026-06-01","endDate":"2026-06-07",
         "tasks":[{"id":"t1","title":"Ship","isCompleted":false,"completedAt":null}],
         "status":"active","retrospectiveId":null,"createdAt":"2026-06-01T00:00:00Z"}
        """.data(using: .utf8)!
        let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
        let week = try d.decode(Week.self, from: json)
        XCTAssertEqual(week.weekNumber, 23)
        XCTAssertEqual(week.tasks.count, 1)
        XCTAssertEqual(week.status, .active)
    }

    func testRetrospectiveDecodes() throws {
        let json = """
        {"id":"u_2026-W23","weekId":"u_2026-W23","weekNumber":23,"year":2026,
         "startDate":"2026-06-01","endDate":"2026-06-07",
         "wentWell":"good","improve":"earlier","onePercent":"plan","summary":"solid",
         "createdAt":"2026-06-07T19:00:00Z"}
        """.data(using: .utf8)!
        let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
        let r = try d.decode(Retrospective.self, from: json)
        XCTAssertEqual(r.onePercent, "plan")
    }

    func testDailySessionUsesTasks() throws {
        let json = """
        {"id":"u_2026-06-02","userId":"u","date":"2026-06-02","weekId":"u_2026-W23",
         "tasks":[{"id":"t1","title":"A","isCompleted":true,"completedAt":null}],
         "middayCallId":null,"eveningCallId":null,"score":7,"scoreRationale":null}
        """.data(using: .utf8)!
        let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
        let s = try d.decode(DailySession.self, from: json)
        XCTAssertEqual(s.tasks.count, 1)
        XCTAssertEqual(s.score, 7)
    }
}
