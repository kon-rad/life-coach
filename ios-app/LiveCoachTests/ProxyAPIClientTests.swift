import XCTest
@testable import Soularc

final class ProxyAPIClientTests: XCTestCase {
    func testAPIErrorHttpErrorDescription() {
        let error = APIError.httpError(404, "Not Found")
        XCTAssertTrue(error.errorDescription?.contains("404") == true)
    }

    private struct DateWrapper: Codable { let createdAt: Date }

    /// Reproduces the home-screen "data couldn't be read" crash: the proxy emits
    /// `createdAt` via JS `Date.toISOString()` (always fractional seconds). The proxy
    /// decoder must accept it.
    func testProxyDecoderAcceptsFractionalSecondTimestamps() throws {
        let json = #"{"createdAt":"2026-06-02T15:04:05.123Z"}"#.data(using: .utf8)!
        XCTAssertNoThrow(try JSONDecoder.proxy().decode(DateWrapper.self, from: json))
    }

    /// Timestamps without fractional seconds must still decode.
    func testProxyDecoderAcceptsNonFractionalTimestamps() throws {
        let json = #"{"createdAt":"2026-06-02T15:04:05Z"}"#.data(using: .utf8)!
        XCTAssertNoThrow(try JSONDecoder.proxy().decode(DateWrapper.self, from: json))
    }

    /// The fractional component is preserved, not silently dropped.
    func testProxyDecoderPreservesFractionalComponent() throws {
        let dec = JSONDecoder.proxy()
        let withFrac = try dec.decode(
            DateWrapper.self, from: #"{"createdAt":"2026-06-02T15:04:05.123Z"}"#.data(using: .utf8)!
        ).createdAt
        let withoutFrac = try dec.decode(
            DateWrapper.self, from: #"{"createdAt":"2026-06-02T15:04:05Z"}"#.data(using: .utf8)!
        ).createdAt
        XCTAssertEqual(withFrac.timeIntervalSince(withoutFrac), 0.123, accuracy: 0.001)
    }

    /// Genuinely malformed dates still surface a decode error rather than a bogus Date.
    func testProxyDecoderRejectsGarbageDate() {
        let json = #"{"createdAt":"not-a-date"}"#.data(using: .utf8)!
        XCTAssertThrowsError(try JSONDecoder.proxy().decode(DateWrapper.self, from: json))
    }
}
