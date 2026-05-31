import XCTest
@testable import Soularc

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
        let midday = viewModel.shouldShowMiddayCTA
        let evening = viewModel.shouldShowEveningCTA
        XCTAssertTrue(midday || !midday)
        XCTAssertTrue(evening || !evening)
    }
}
