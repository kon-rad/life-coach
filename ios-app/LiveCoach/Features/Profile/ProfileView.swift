import SwiftUI
import RevenueCat

struct ProfileView: View {
    @Environment(AppState.self) var appState
    @State private var authService = AuthService()
    @State private var subscriptionService = SubscriptionService()

    @State private var showPaywall = false
    @State private var showVoiceCredits = false
    @State private var showRedeemCode = false
    @State private var showDeleteConfirm1 = false
    @State private var showDeleteConfirm2 = false
    @State private var deleteConfirmText = ""
    @State private var showExportAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    @State private var showEditProfile = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                subscriptionCard
                aboutYouSection
                retrospectivesSection
                remindersSection
                privacySection
                accountSection

                Text("Soularc 1.0.0")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.lcTextFaint)
                    .tracking(-0.1)
                    .padding(.top, 12)
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background(Color.lcBackground)
        .task {
            try? await subscriptionService.fetchOfferings()
            try? await subscriptionService.fetchStatus()
            if Constants.devMode { appState.isPremium = true; appState.hasActivePlan = true }
            else { appState.apply(tier: subscriptionService.tier) }
        }
        .sheet(isPresented: $showPaywall) {
            SubscriptionPaywallView(subscriptionService: subscriptionService)
                .onDisappear {
                    if Constants.devMode { appState.isPremium = true; appState.hasActivePlan = true }
                    else { appState.apply(tier: subscriptionService.tier) }
                }
        }
        .sheet(isPresented: $showRedeemCode) {
            RedeemCodeView()
        }
        .sheet(isPresented: $showVoiceCredits) {
            VoiceCreditsSheet(subscriptionService: subscriptionService)
        }
        .sheet(isPresented: $showEditProfile) {
            NavigationStack {
                AboutYouView(
                    title: "About you",
                    ctaTitle: "Save",
                    name: appState.currentUser?.displayName ?? "",
                    occupation: appState.currentUser?.occupation ?? "",
                    bio: appState.currentUser?.bio ?? "",
                    motivation: appState.currentUser?.motivation ?? "",
                    style: CoachingStyle(fromRaw: appState.currentUser?.coachingStyle ?? "balanced"),
                    onDone: {
                        showEditProfile = false
                        Task { await reloadProfile() }
                    }
                )
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showEditProfile = false }
                    }
                }
            }
        }
        .alert("Export Data", isPresented: $showExportAlert) {
            Button("OK", role: .cancel) {}
        } message: { Text("Coming soon") }
        .alert("Error", isPresented: $showErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorMessage) }
        .alert("Delete Account", isPresented: $showDeleteConfirm1) {
            Button("Continue", role: .destructive) { showDeleteConfirm2 = true }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete all your data. This cannot be undone.")
        }
        .alert("Are you sure?", isPresented: $showDeleteConfirm2) {
            TextField("Type DELETE to confirm", text: $deleteConfirmText)
            Button("Delete", role: .destructive) {
                guard deleteConfirmText == "DELETE" else { return }
                Task { await performDeleteAccount() }
            }
            Button("Cancel", role: .cancel) { deleteConfirmText = "" }
        } message: { Text("Type DELETE to confirm account deletion.") }
    }

    // MARK: - Subscription Card

    private var subscriptionCard: some View {
        LCCard(padding: 0) {
            VStack(spacing: 0) {
                // Gradient header
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        HStack(spacing: 6) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 11))
                            Text(planBadge.uppercased())
                                .font(.system(size: 11.5, weight: .semibold))
                                .tracking(0.6)
                        }
                        .foregroundStyle(Color.lcAccent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.lcSurface)
                        .clipShape(Capsule())

                        Spacer()
                    }

                    Text("Soularc Plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-0.6)

                    Text(subscriptionSubtitle)
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.1)
                }
                .padding(20)
                .background(
                    LinearGradient(
                        colors: [Color.lcAccent.opacity(0.12), Color.lcAccent.opacity(0.04)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                Color.lcHairline.frame(height: 0.5)

                profileRow(label: "Manage subscription") {
                    if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                        UIApplication.shared.open(url)
                    }
                }

                Color.lcHairline.frame(height: 0.5)

                profileRow(label: "Redeem a code") {
                    showRedeemCode = true
                }
            }
        }
        .padding(.top, 8)
    }

    // MARK: - About You

    private var aboutYouSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: "Your coach")

            LCCard(padding: 0) {
                Button { showEditProfile = true } label: {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Personal profile")
                                .font(.system(size: 15.5))
                                .foregroundStyle(Color.lcText)
                                .tracking(-0.2)
                            Text(aboutYouSubtitle)
                                .font(.system(size: 13))
                                .foregroundStyle(Color.lcTextDim)
                                .tracking(-0.1)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.lcTextFaint)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var aboutYouSubtitle: String {
        let name = appState.currentUser?.displayName ?? ""
        let hasContext = !(appState.currentUser?.bio ?? "").isEmpty
            || !(appState.currentUser?.occupation ?? "").isEmpty
            || !(appState.currentUser?.motivation ?? "").isEmpty
        if name.isEmpty && !hasContext {
            return "Add your name and context so your coach can personalize."
        }
        let style = CoachingStyle(fromRaw: appState.currentUser?.coachingStyle ?? "balanced")
        return "Coaching style: \(style.label)"
    }

    private func reloadProfile() async {
        if let user: User = try? await ProxyAPIClient.shared.get("/user/profile") {
            appState.currentUser = user
        }
    }

    // MARK: - Retrospectives

    private var retrospectivesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: "Progress")
            LCCard(padding: 0) {
                NavigationLink { RetrospectiveListView() } label: {
                    profileRowLabel(label: "Weekly Retrospective Reports")
                }.buttonStyle(.plain)
            }
        }
    }

    // MARK: - Reminders

    private var remindersSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: "Reminders")

            LCCard(padding: 0) {
                NavigationLink {
                    NotificationSettingsView()
                } label: {
                    profileRowLabel(label: "Midday check-in reminder")
                }
                .buttonStyle(.plain)

                Color.lcHairline.frame(height: 0.5)

                NavigationLink {
                    NotificationSettingsView()
                } label: {
                    profileRowLabel(label: "Evening reminder")
                }
                .buttonStyle(.plain)

                Color.lcHairline.frame(height: 0.5)

                NavigationLink {
                    NotificationSettingsView()
                } label: {
                    profileRowLabel(label: "Weekly planning reminder")
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Privacy

    private var privacySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: "Privacy")

            LCCard(padding: 0) {
                profileRow(label: "Export my data") { showExportAlert = true }

                Color.lcHairline.frame(height: 0.5)

                profileRow(label: "Delete history", color: Color.lcRed) { showDeleteConfirm1 = true }
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: "Account")

            LCCard(padding: 0) {
                profileRow(label: "Help & support") {
                    if let url = URL(string: "https://soularc.xyz/support") {
                        UIApplication.shared.open(url)
                    }
                }

                Color.lcHairline.frame(height: 0.5)

                profileRow(label: "Sign out", color: Color.lcRed) {
                    do {
                        try authService.signOut()
                        UserDefaults.standard.removeObject(forKey: "isOnboardingComplete")
                        appState.clearAll()
                        appState.isOnboardingComplete = false
                    } catch {
                        errorMessage = error.localizedDescription
                        showErrorAlert = true
                    }
                }
            }
        }
    }

    // MARK: - Row Helpers

    private func profileRow(label: String, color: Color = .lcText, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(.system(size: 15.5))
                    .foregroundStyle(color)
                    .tracking(-0.2)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.lcTextFaint)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }

    private func profileRowLabel(label: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 15.5))
                .foregroundStyle(Color.lcText)
                .tracking(-0.2)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.lcTextFaint)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
    }

    // MARK: - Helpers

    private var planBadge: String {
        guard appState.hasActivePlan else { return "Free" }
        let tierName = appState.isPremium ? "Premium" : "Standard"
        let pid = subscriptionService.customerInfo?
            .entitlements.active.values.first?.productIdentifier.lowercased() ?? ""
        let period = (pid.contains("year") || pid.contains("annual")) ? "Yearly"
            : (pid.contains("week") ? "Weekly" : "")
        return period.isEmpty ? tierName : "\(tierName) · \(period)"
    }

    private var subscriptionSubtitle: String {
        guard appState.hasActivePlan else { return "Upgrade to unlock voice calls and unlimited chat." }
        return appState.isPremium
            ? "You're on Soularc Premium · 2 daily check-ins + weekly planning"
            : "You're on Soularc Standard · 1 daily check-in + weekly planning"
    }

    private func performDeleteAccount() async {
        do {
            try await authService.deleteAccount()
            UserDefaults.standard.removeObject(forKey: "isOnboardingComplete")
            appState.clearAll()
            appState.isOnboardingComplete = false
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }
}
