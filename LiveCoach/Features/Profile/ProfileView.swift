import SwiftUI
import RevenueCat

struct ProfileView: View {
    @Environment(AppState.self) var appState
    @State private var authService = AuthService()
    @State private var subscriptionService = SubscriptionService()

    @State private var showEditName = false
    @State private var showPaywall = false
    @State private var showVoiceCredits = false
    @State private var showDeleteConfirm1 = false
    @State private var showDeleteConfirm2 = false
    @State private var deleteConfirmText = ""
    @State private var showExportAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            List {
                profileHeaderSection
                subscriptionSection
                settingsSection
                privacySection
                signOutSection
            }
            .navigationTitle("Profile")
            .task {
                try? await subscriptionService.fetchOfferings()
                try? await subscriptionService.fetchStatus()
                appState.isPremium = subscriptionService.isPremium
            }
            .sheet(isPresented: $showEditName) {
                EditNameSheet(initialName: appState.currentUser?.displayName ?? "") { name in
                    appState.currentUser?.displayName = name
                }
            }
            .sheet(isPresented: $showPaywall) {
                SubscriptionPaywallView(subscriptionService: subscriptionService)
                    .onDisappear { appState.isPremium = subscriptionService.isPremium }
            }
            .sheet(isPresented: $showVoiceCredits) {
                VoiceCreditsSheet(subscriptionService: subscriptionService)
            }
            .alert("Export Data", isPresented: $showExportAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Coming soon")
            }
            .alert("Error", isPresented: $showErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .alert("Delete Account", isPresented: $showDeleteConfirm1) {
                Button("Continue", role: .destructive) { showDeleteConfirm2 = true }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete all your data including all conversations, projects, and progress. This cannot be undone.")
            }
            .alert("Are you sure?", isPresented: $showDeleteConfirm2) {
                TextField("Type DELETE to confirm", text: $deleteConfirmText)
                Button("Delete", role: .destructive) {
                    guard deleteConfirmText == "DELETE" else { return }
                    Task { await performDeleteAccount() }
                }
                Button("Cancel", role: .cancel) { deleteConfirmText = "" }
            } message: {
                Text("Type DELETE to confirm account deletion.")
            }
        }
    }

    // MARK: - Sections

    private var profileHeaderSection: some View {
        Section {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color(.systemGray4))
                        .frame(width: 64, height: 64)
                    Text(initials)
                        .font(.title2.bold())
                        .foregroundStyle(.secondary)
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(appState.currentUser?.displayName ?? "—")
                            .font(.headline)
                        Button {
                            showEditName = true
                        } label: {
                            Image(systemName: "pencil")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                    if let createdAt = appState.currentUser?.createdAt {
                        Text("Member since \(createdAt.formatted(.dateTime.month(.wide).year()))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }

    private var subscriptionSection: some View {
        Section("Subscription") {
            HStack {
                Text("Plan")
                Spacer()
                Text(planBadge)
                    .font(.subheadline.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(appState.isPremium ? Color.blue.opacity(0.15) : Color(.systemGray5))
                    .foregroundStyle(appState.isPremium ? Color.blue : Color.secondary)
                    .clipShape(Capsule())
            }

            let minutesRemaining = appState.userStats?.voiceMinutesRemainingThisWeek ?? 0
            VoiceMinutesBanner(minutesRemaining: minutesRemaining)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)

            if appState.isPremium {
                Button("Manage subscription") {
                    if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                        UIApplication.shared.open(url)
                    }
                }
            } else {
                Button("Upgrade plan") {
                    showPaywall = true
                }
                .font(.body.bold())
            }

            Button("Buy voice minutes") {
                showVoiceCredits = true
            }

            Button("Restore purchases") {
                Task {
                    try? await subscriptionService.restorePurchases()
                    appState.isPremium = subscriptionService.isPremium
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }

    private var settingsSection: some View {
        Section("Settings") {
            NavigationLink("Notification Settings") {
                NotificationSettingsView()
            }
        }
    }

    private var privacySection: some View {
        Section("Privacy & Data") {
            // swiftlint:disable:next force_unwrapping
            Link("Privacy Policy", destination: URL(string: "https://livecoach.app/privacy")!)

            Button("Export my data") {
                showExportAlert = true
            }

            Button("Delete Account", role: .destructive) {
                showDeleteConfirm1 = true
            }
        }
    }

    private var signOutSection: some View {
        Section {
            Button("Sign Out", role: .destructive) {
                do {
                    try authService.signOut()
                    UserDefaults.standard.removeObject(forKey: "isOnboardingComplete")
                    appState.isOnboardingComplete = false
                } catch {
                    errorMessage = error.localizedDescription
                    showErrorAlert = true
                }
            }
        }
    }

    // MARK: - Helpers

    private var initials: String {
        let name = appState.currentUser?.displayName ?? ""
        let parts = name.split(separator: " ").prefix(2)
        return parts.map { String($0.prefix(1)).uppercased() }.joined()
    }

    private var planBadge: String {
        guard appState.isPremium else { return "Free" }
        guard let info = subscriptionService.customerInfo,
              let entitlement = info.entitlements[Constants.Entitlements.premium],
              entitlement.isActive else { return "Premium" }
        let pid = entitlement.productIdentifier.lowercased()
        if pid.contains("annual") || pid.contains("year") { return "Annual" }
        return "Monthly"
    }

    private func performDeleteAccount() async {
        do {
            try await authService.deleteAccount()
            UserDefaults.standard.removeObject(forKey: "isOnboardingComplete")
            appState.isOnboardingComplete = false
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }
}

// MARK: - Edit Name Sheet

private struct EditNameSheet: View {
    let initialName: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name: String

    init(initialName: String, onSave: @escaping (String) -> Void) {
        self.initialName = initialName
        self.onSave = onSave
        _name = State(initialValue: initialName)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Display Name") {
                    TextField("Your name", text: $name)
                }
            }
            .navigationTitle("Edit Name")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !trimmed.isEmpty { onSave(trimmed) }
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
