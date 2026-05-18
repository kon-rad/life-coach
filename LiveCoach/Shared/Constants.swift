import Foundation

enum Constants {
    static let proxyBaseURL = ProcessInfo.processInfo.environment["PROXY_BASE_URL"] ?? "http://localhost:3000"
    static let revenueCatAPIKey = ProcessInfo.processInfo.environment["REVENUECAT_API_KEY"] ?? "REPLACE_ME"
    static let vapiPublicKey = ProcessInfo.processInfo.environment["VAPI_PUBLIC_KEY"] ?? "REPLACE_ME"
    static let weeklyVoiceQuotaSeconds = 3600
    static let freeTierDailyMessageLimit = 10

    enum Entitlements {
        static let premium = "premium"
    }

    enum DailyQuotes {
        static let all: [String] = [
            "Small daily improvements are the key to staggering long-term results.",
            "You don't rise to the level of your goals. You fall to the level of your systems.",
            "The secret of getting ahead is getting started.",
            "Action is the foundational key to all success.",
            "Progress, not perfection.",
            "Every expert was once a beginner.",
            "Discipline is the bridge between goals and accomplishment.",
            "Your future self is watching you right now.",
            "Do something today that your future self will thank you for.",
            "The only way to do great work is to love what you do.",
            "Start where you are. Use what you have. Do what you can.",
            "Success is the sum of small efforts, repeated day in and day out.",
            "The harder you work for something, the greater you'll feel when you achieve it.",
            "Don't watch the clock. Do what it does. Keep going.",
            "You are braver than you believe, stronger than you seem.",
            "Push yourself, because no one else is going to do it for you.",
            "Great things never come from comfort zones.",
            "Dream it. Wish it. Do it.",
            "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
            "One day or day one. You decide."
        ]

        static func quote(for date: Date = Date()) -> String {
            let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
            return all[(dayOfYear - 1) % all.count]
        }
    }
}
