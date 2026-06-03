import SwiftUI
import RevenueCat

struct SubscriptionPaywallView: View {
    let subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) var appState

    @State private var isLoading = false
    @State private var showToast = false
    @State private var errorMessage: String?
    @State private var showError = false

    private func package(_ productId: String) -> Package? {
        subscriptionService.availablePackages.first { $0.storeProduct.productIdentifier == productId }
    }

    private var standardWeekly: Package? { package(Constants.Products.standardWeekly) }
    private var standardYearly: Package? { package(Constants.Products.standardYearly) }
    private var premiumWeekly: Package? { package(Constants.Products.premiumWeekly) }
    private var premiumYearly: Package? { package(Constants.Products.premiumYearly) }

    private var hasNamedPackages: Bool {
        standardWeekly != nil || standardYearly != nil || premiumWeekly != nil || premiumYearly != nil
    }

    private var fallbackPackages: [Package] {
        subscriptionService.availablePackages.filter {
            !$0.identifier.lowercased().contains("credit") &&
            !$0.identifier.lowercased().contains("voice")
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Soularc Plus")
                        .font(.title.bold())
                        .multilineTextAlignment(.center)

                    featureList

                    packageButtons

                    Button("Restore purchases") {
                        Task { await restorePurchases() }
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }
                .padding()
            }
            .navigationTitle("Upgrade")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .disabled(isLoading)
            .overlay {
                if isLoading {
                    Color.black.opacity(0.3).ignoresSafeArea()
                    ProgressView().scaleEffect(1.5).tint(.white)
                }
            }
            .overlay(alignment: .bottom) {
                if showToast {
                    Text("Welcome to Premium! 🎉")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .padding()
                        .background(Color(.systemIndigo))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.bottom, 32)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.spring(), value: showToast)
            .alert("Purchase Failed", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An error occurred. Please try again.")
            }
        }
    }

    // MARK: - Subviews

    private var featureList: some View {
        VStack(alignment: .leading, spacing: 12) {
            featureRow("Unlimited text chat")
            featureRow("Daily & weekly voice coaching")
            featureRow("Standard 65 / Premium 115 voice min/week")
            featureRow("All your data encrypted")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func featureRow(_ text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark")
                .foregroundStyle(.green)
                .fontWeight(.semibold)
            Text(text)
                .font(.subheadline)
            Spacer()
        }
    }

    @ViewBuilder
    private var packageButtons: some View {
        VStack(spacing: 20) {
            if hasNamedPackages {
                tierSection(
                    title: "Standard",
                    subtitle: "1 daily check-in + weekly planning",
                    weekly: standardWeekly,
                    yearly: standardYearly
                )
                tierSection(
                    title: "Premium",
                    subtitle: "2 daily check-ins + weekly planning",
                    weekly: premiumWeekly,
                    yearly: premiumYearly
                )
            } else {
                ForEach(fallbackPackages) { package in
                    purchaseButton(
                        label: "\(package.storeProduct.localizedTitle) — \(package.localizedPriceString)",
                        package: package
                    )
                }
            }
            if subscriptionService.availablePackages.isEmpty {
                Text("No plans available at this time.")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private func tierSection(title: String, subtitle: String, weekly: Package?, yearly: Package?) -> some View {
        if weekly != nil || yearly != nil {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.headline)
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
                if let yearly {
                    let savings = savingsLabel(weekly: weekly, yearly: yearly)
                    purchaseButton(
                        label: "Yearly — \(yearly.localizedPriceString)/year\(savings)",
                        package: yearly
                    )
                }
                if let weekly {
                    purchaseButton(
                        label: "Weekly — \(weekly.localizedPriceString)/week",
                        package: weekly
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func purchaseButton(label: String, package: Package) -> some View {
        Button {
            Task { await purchase(package: package) }
        } label: {
            Text(label)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemIndigo))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: - Actions

    private func purchase(package: Package) async {
        isLoading = true
        do {
            try await subscriptionService.purchase(package: package)
            isLoading = false
            if subscriptionService.hasActivePlan {
                appState.apply(tier: subscriptionService.tier)
                withAnimation { showToast = true }
                try? await Task.sleep(for: .seconds(1.5))
                dismiss()
            }
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    private func restorePurchases() async {
        isLoading = true
        do {
            try await subscriptionService.restorePurchases()
            isLoading = false
            if subscriptionService.hasActivePlan {
                appState.apply(tier: subscriptionService.tier)
            }
            dismiss()
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// "save N%" comparing the yearly price against 52× the weekly price.
    private func savingsLabel(weekly: Package?, yearly: Package) -> String {
        guard let weekly else { return "" }
        let weeklyPrice = weekly.storeProduct.price as Decimal
        let yearlyPrice = yearly.storeProduct.price as Decimal
        let yearlyFromWeekly = weeklyPrice * 52
        guard yearlyFromWeekly > 0 else { return "" }
        let savings = (yearlyFromWeekly - yearlyPrice) / yearlyFromWeekly * 100
        let savingsInt = Int(truncating: savings as NSDecimalNumber)
        guard savingsInt > 0 else { return "" }
        return " (save \(savingsInt)%)"
    }
}

// MARK: - Voice Credits Sheet

struct VoiceCreditsSheet: View {
    let subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss

    private var creditPackages: [Package] {
        subscriptionService.availablePackages.filter {
            $0.identifier.lowercased().contains("credit") ||
            $0.identifier.lowercased().contains("voice")
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Purchase additional voice minutes for your AI coaching sessions.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                }

                Section("Voice Credit Packs") {
                    if creditPackages.isEmpty {
                        placeholderCredits
                    } else {
                        ForEach(creditPackages) { package in
                            CreditPackageRow(package: package, subscriptionService: subscriptionService)
                        }
                    }
                }
            }
            .navigationTitle("Buy Voice Minutes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private var placeholderCredits: some View {
        Group {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("30 Voice Minutes").font(.headline)
                    Text("$4.99").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Text("Coming soon").font(.caption).foregroundStyle(.secondary)
            }
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("120 Voice Minutes").font(.headline)
                    Text("$14.99").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Text("Coming soon").font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

private struct CreditPackageRow: View {
    let package: Package
    let subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(package.storeProduct.localizedTitle).font(.headline)
                Text(package.localizedPriceString).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            Button("Buy") {
                isLoading = true
                Task {
                    try? await subscriptionService.purchase(package: package)
                    isLoading = false
                    dismiss()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding(.vertical, 4)
    }
}
