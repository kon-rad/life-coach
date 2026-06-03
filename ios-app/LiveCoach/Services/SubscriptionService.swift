import Foundation
import RevenueCat

@MainActor @Observable final class SubscriptionService {
    /// The active subscription tier, derived from RevenueCat entitlements.
    enum Tier: Sendable { case free, standard, premium }

    var customerInfo: CustomerInfo?
    var tier: Tier = .free
    /// Premium ⊇ standard: a premium subscriber satisfies any standard-gated feature.
    var isPremium: Bool { tier == .premium }
    /// True for any active paid plan (standard or premium).
    var hasActivePlan: Bool { tier != .free }
    var availablePackages: [Package] = []
    var isLoading = false
    var error: Error?

    func fetchStatus() async throws {
        isLoading = true
        defer { isLoading = false }
        let info = try await Purchases.shared.customerInfo()
        customerInfo = info
        tier = Self.tier(from: info)
    }

    nonisolated static func tier(from info: CustomerInfo) -> Tier {
        if info.entitlements[Constants.Entitlements.premium]?.isActive == true { return .premium }
        if info.entitlements[Constants.Entitlements.standard]?.isActive == true { return .standard }
        return .free
    }

    func purchase(package: Package) async throws {
        isLoading = true
        defer { isLoading = false }
        _ = try await Purchases.shared.purchase(package: package)
        try await fetchStatus()
    }

    func restorePurchases() async throws {
        isLoading = true
        defer { isLoading = false }
        _ = try await Purchases.shared.restorePurchases()
        try await fetchStatus()
    }

    func fetchOfferings() async throws {
        isLoading = true
        defer { isLoading = false }
        let offerings = try await Purchases.shared.offerings()
        availablePackages = offerings.current?.availablePackages ?? []
    }
}
