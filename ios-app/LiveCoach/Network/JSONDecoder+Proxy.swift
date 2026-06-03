import Foundation

extension JSONDecoder {
    /// The decoder used for every proxy response.
    ///
    /// The proxy serialises all timestamps with JavaScript's `Date.toISOString()`, which
    /// always emits fractional seconds (e.g. `2026-06-02T15:04:05.123Z`). Swift's built-in
    /// `.iso8601` strategy parses with `ISO8601DateFormatter` configured for only
    /// `.withInternetDateTime`, which *rejects* fractional seconds — so a single timestamp
    /// anywhere in a payload (e.g. `User.createdAt`) fails the entire decode with
    /// "The data couldn't be read because it isn't in the correct format."
    ///
    /// This decoder accepts ISO-8601 timestamps with or without fractional seconds.
    static func proxy() -> JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .lenientISO8601
        return d
    }
}

extension JSONDecoder.DateDecodingStrategy {
    /// Parses ISO-8601 timestamps whether or not they carry fractional seconds.
    static let lenientISO8601: JSONDecoder.DateDecodingStrategy = .custom { decoder in
        let container = try decoder.singleValueContainer()
        let string = try container.decode(String.self)
        if let date = ISO8601DateParser.date(from: string) {
            return date
        }
        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Expected ISO-8601 date string, got \(string)"
        )
    }
}

/// Tolerant ISO-8601 parsing shared by the proxy decoder. Tries the fractional-seconds
/// form first (what the proxy actually emits), then the plain internet-date-time form.
enum ISO8601DateParser {
    private static let withFractionalSeconds: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let withoutFractionalSeconds: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func date(from string: String) -> Date? {
        withFractionalSeconds.date(from: string) ?? withoutFractionalSeconds.date(from: string)
    }
}
