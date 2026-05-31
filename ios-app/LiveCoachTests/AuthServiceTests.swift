import XCTest
@testable import LiveCoach

final class AuthServiceTests: XCTestCase {
    @MainActor
    func testAuthServiceInitializesWithoutCrash() async {
        let authService = AuthService()
        XCTAssertNil(authService.currentFirebaseUser)
        XCTAssertFalse(authService.isLoading)
    }

    @MainActor
    func testCurrentFirebaseUserIsNilWhenNoUserSignedIn() async {
        let authService = AuthService()
        XCTAssertNil(authService.currentFirebaseUser,
                     "currentFirebaseUser should be nil when Firebase is not configured in tests")
    }
}
