import XCTest
@testable import LiveCoach

final class ProxyAPIClientTests: XCTestCase {
    func testAPIErrorHttpErrorDescription() {
        let error = APIError.httpError(404, "Not Found")
        XCTAssertTrue(error.errorDescription?.contains("404") == true)
    }
}
