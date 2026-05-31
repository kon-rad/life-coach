import XCTest
@testable import Soularc

final class AppStateTests: XCTestCase {
    @MainActor
    func testAppStateInitialValues() async {
        let appState = AppState()
        XCTAssertFalse(appState.isOnboardingComplete)
        appState.isPremium = true
        XCTAssertTrue(appState.isPremium)
    }
}
