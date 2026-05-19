import Foundation
import RevenueCat

final class RevenueCatDelegate: NSObject, PurchasesDelegate {
    var onPremiumStatusChange: ((Bool) -> Void)?

    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        let isPremium = customerInfo.entitlements[Constants.Entitlements.premium]?.isActive == true
        onPremiumStatusChange?(isPremium)
    }
}
