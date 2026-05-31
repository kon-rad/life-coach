import Foundation
import RevenueCat

@MainActor @Observable final class SubscriptionService {
    var customerInfo: CustomerInfo?
    var isPremium: Bool = false
    var availablePackages: [Package] = []
    var isLoading = false
    var error: Error?

    func fetchStatus() async throws {
        isLoading = true
        defer { isLoading = false }
        let info = try await Purchases.shared.customerInfo()
        customerInfo = info
        isPremium = info.entitlements[Constants.Entitlements.premium]?.isActive == true
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
