import SwiftUI
import RevenueCat

struct SubscriptionPaywallView: View {
    let subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss

    private var planPackages: [Package] {
        subscriptionService.availablePackages.filter {
            !$0.identifier.lowercased().contains("credit") &&
            !$0.identifier.lowercased().contains("voice")
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Get unlimited AI coaching with a Live Coach Premium subscription.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .listRowBackground(Color.clear)
                }

                Section("Plans") {
                    if planPackages.isEmpty {
                        Text("No plans available at this time.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(planPackages) { package in
                            PlanPackageRow(package: package, subscriptionService: subscriptionService)
                        }
                    }
                }
            }
            .navigationTitle("Upgrade Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

private struct PlanPackageRow: View {
    let package: Package
    let subscriptionService: SubscriptionService
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(package.storeProduct.localizedTitle)
                    .font(.headline)
                Text(package.localizedPriceString)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Select") {
                isLoading = true
                Task {
                    try? await subscriptionService.purchase(package: package)
                    isLoading = false
                    if subscriptionService.isPremium { dismiss() }
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding(.vertical, 4)
    }
}

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
                    Text("30 Voice Minutes")
                        .font(.headline)
                    Text("$4.99")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text("Coming soon")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("120 Voice Minutes")
                        .font(.headline)
                    Text("$14.99")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text("Coming soon")
                    .font(.caption)
                    .foregroundStyle(.secondary)
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
                Text(package.storeProduct.localizedTitle)
                    .font(.headline)
                Text(package.localizedPriceString)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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
