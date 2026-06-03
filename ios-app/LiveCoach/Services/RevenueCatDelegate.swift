import Foundation
import RevenueCat

final class RevenueCatDelegate: NSObject, PurchasesDelegate {
    var onTierChange: ((SubscriptionService.Tier) -> Void)?

    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        onTierChange?(SubscriptionService.tier(from: customerInfo))
    }
}
