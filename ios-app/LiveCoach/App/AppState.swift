import SwiftUI

@MainActor
@Observable final class AppState {
    var currentUser: User? {
        didSet { serverSubscriptionStatus = currentUser?.subscriptionStatus }
    }
    /// Server-authoritative subscription grant from `/user/profile` (e.g. a redeemed
    /// coupon). Folded into the gating flags so access works even when the client
    /// RevenueCat entitlement is absent (sandbox, relaunch, or logIn timing).
    var serverSubscriptionStatus: String?
    var todaySession: DailySession?
    var userStats: UserStats?
    var isOnboardingComplete: Bool = false
    /// Premium tier active (RevenueCat-driven). Premium ⊇ standard.
    var isPremium: Bool = false
    /// Any active paid plan (standard or premium) — gates voice calls & unlimited chat.
    var hasActivePlan: Bool = false
    var isLoading: Bool = false
    var errorMessage: String?

    func setError(_ error: Error?) {
        errorMessage = error?.localizedDescription
    }

    /// Fold a RevenueCat-derived tier into the gating flags, combined with the
    /// server-authoritative grant. Premium ⊇ standard, so a premium subscriber (from
    /// either source) satisfies both `isPremium` and `hasActivePlan`. The server grant
    /// can only *unlock* access — it never downgrades a RevenueCat entitlement.
    func apply(tier: SubscriptionService.Tier) {
        let serverPremium = serverSubscriptionStatus == "premium"
        let serverPaid = serverPremium || serverSubscriptionStatus == "standard"
        isPremium = tier == .premium || serverPremium
        hasActivePlan = tier != .free || serverPaid
    }

    func clearAll() {
        currentUser = nil
        serverSubscriptionStatus = nil
        todaySession = nil
        userStats = nil
        isPremium = false
        hasActivePlan = false
        errorMessage = nil
    }
}
