import XCTest
@testable import LiveCoach

final class SubscriptionServiceTests: XCTestCase {
    @MainActor
    func testSubscriptionServiceInitializesWithoutCrash() {
        let service = SubscriptionService()
        XCTAssertNil(service.customerInfo)
        XCTAssertFalse(service.isPremium)
    }

    @MainActor
    func testIsPremiumIsFalseByDefault() {
        let service = SubscriptionService()
        XCTAssertFalse(service.isPremium)
    }
}
