import XCTest
@testable import LiveCoach

final class AppStateTests: XCTestCase {
    @MainActor
    func testAppStateInitialValues() async {
        let appState = AppState()
        XCTAssertFalse(appState.isOnboardingComplete)
        appState.isPremium = true
        XCTAssertTrue(appState.isPremium)
    }
}
