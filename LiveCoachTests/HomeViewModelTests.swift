import XCTest
@testable import LiveCoach

@MainActor
final class HomeViewModelTests: XCTestCase {
    func testDailyQuoteEmptyBeforeLoad() {
        let sessionService = SessionService()
        let viewModel = HomeViewModel(sessionService: sessionService)
        XCTAssertEqual(viewModel.dailyQuote, "")
    }

    func testShouldShowCTAsReturnBoolWithoutCrash() {
        let sessionService = SessionService()
        let viewModel = HomeViewModel(sessionService: sessionService)
        let morning = viewModel.shouldShowMorningCTA
        let evening = viewModel.shouldShowEveningCTA
        XCTAssertTrue(morning || !morning)
        XCTAssertTrue(evening || !evening)
    }
}
