import SwiftUI
import RevenueCat

/// Lets a user redeem a promo code (e.g. NS2026) for a permanent Soularc Plus
/// subscription. Calls `POST /user/redeem-coupon`; on success the grant lives
/// server-side and is reflected via `appState.serverIsPremium`.
struct RedeemCodeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState

    @State private var code = ""
    @State private var isSubmitting = false
    @State private var message: String?
    @State private var didSucceed = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Have a code?")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Color.lcText)

                Text("Enter your promo code to unlock Soularc Plus.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.lcTextDim)
                    .multilineTextAlignment(.center)

                TextField("Promo code", text: $code)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .multilineTextAlignment(.center)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
                    .disabled(didSucceed || isSubmitting)
                    .onSubmit(submit)

                if let message {
                    Text(message)
                        .font(.system(size: 13))
                        .foregroundStyle(didSucceed ? Color.lcGreen : Color.lcRed)
                        .multilineTextAlignment(.center)
                }

                Button(action: submit) {
                    Group {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text(didSucceed ? "Done" : "Redeem")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.lcAccent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isSubmitting || (!didSucceed && code.trimmingCharacters(in: .whitespaces).isEmpty))

                Spacer()
            }
            .padding(24)
            .background(Color.lcBackground)
            .navigationTitle("Redeem Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func submit() {
        if didSucceed { dismiss(); return }
        let trimmed = code.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !isSubmitting else { return }

        isSubmitting = true
        message = nil
        Task {
            defer { isSubmitting = false }
            struct Body: Encodable { let code: String }
            struct Resp: Decodable { let status: String }
            do {
                let resp: Resp = try await ProxyAPIClient.shared.post(
                    "/user/redeem-coupon", body: Body(code: trimmed)
                )
                if resp.status == "premium" {
                    // The proxy granted a RevenueCat promo entitlement — refresh so
                    // the app's RevenueCat-driven premium status picks it up.
                    await refreshPremiumFromRevenueCat()
                    appState.isPremium = true
                    appState.hasActivePlan = true
                    didSucceed = true
                    message = "Success! Soularc Plus is unlocked."
                } else {
                    message = "That code isn't valid."
                }
            } catch {
                message = friendlyError(error)
            }
        }
    }

    private func refreshPremiumFromRevenueCat() async {
        guard Purchases.isConfigured else { return }
        Purchases.shared.invalidateCustomerInfoCache()
        if let info = try? await Purchases.shared.customerInfo() {
            if info.entitlements[Constants.Entitlements.premium]?.isActive == true {
                appState.serverSubscriptionStatus = "premium"
                appState.isPremium = true
                appState.hasActivePlan = true
            }
        }
    }

    private func friendlyError(_ error: Error) -> String {
        if case APIError.httpError(let status, _) = error {
            switch status {
            case 404: return "That code isn't valid."
            case 409: return "A code has already been redeemed on this account."
            default: break
            }
        }
        return "Couldn't redeem that code. Please try again."
    }
}
