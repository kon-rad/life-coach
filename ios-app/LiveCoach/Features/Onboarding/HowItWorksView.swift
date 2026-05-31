import SwiftUI

struct HowItWorksView: View {
    let onComplete: () -> Void

    @Environment(AppState.self) private var appState
    @State private var subscriptionService = SubscriptionService()
    @State private var showPaywall = false
    @State private var isFetchingOfferings = false
    @State private var selectedPlan: PlanOption = .annual

    enum PlanOption { case monthly, annual }

    private let steps: [(icon: String, title: String, detail: String)] = [
        ("mic",        "Morning voice call",   "Five minutes to set the day. The AI gives you 3 micro-actions."),
        ("target",     "Three micro-actions",  "Small, specific, doable. Check them off as you go."),
        ("waveform",   "Evening reflection",   "A short call. You get a score from 0 to 10."),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("How it works.")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                    .tracking(-0.8)
                    .padding(.bottom, 22)

                // Step cards
                VStack(spacing: 10) {
                    ForEach(steps, id: \.title) { step in
                        HStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.lcAccentSofter)
                                    .frame(width: 56, height: 56)
                                Image(systemName: step.icon)
                                    .font(.system(size: 22))
                                    .foregroundStyle(Color.lcAccent)
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.title)
                                    .font(.system(size: 15.5, weight: .semibold))
                                    .foregroundStyle(Color.lcText)
                                    .tracking(-0.2)
                                Text(step.detail)
                                    .font(.system(size: 13.5))
                                    .foregroundStyle(Color.lcTextDim)
                                    .tracking(-0.1)
                                    .lineSpacing(3)
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(Color.lcSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(Color.lcHairline, lineWidth: 0.5)
                        )
                    }
                }
                .padding(.bottom, 24)

                // Plan picker card
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("Soularc Plus")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.lcText)
                            .tracking(-0.3)
                        Spacer()
                        Text("7-DAY FREE TRIAL")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.lcAccent)
                            .tracking(0.6)
                    }
                    .padding(.bottom, 14)

                    HStack(spacing: 10) {
                        ForEach([PlanOption.monthly, .annual], id: \.self) { plan in
                            let isSelected = selectedPlan == plan
                            Button { selectedPlan = plan } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(plan == .monthly ? "Monthly" : "Annual")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(Color.lcTextDim)
                                    Text(plan == .monthly ? "$19" : "$129")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundStyle(Color.lcText)
                                        .tracking(-0.4)
                                    Text(plan == .monthly ? "per month" : "$10.75/mo · save 43%")
                                        .font(.system(size: 11.5))
                                        .foregroundStyle(Color.lcTextDim)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(isSelected ? Color.lcAccentSofter : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(isSelected ? Color.lcAccent : Color.lcHairlineStrong,
                                                lineWidth: isSelected ? 1.5 : 0.5)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(16)
                .background(Color.lcSurface)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(Color.lcHairline, lineWidth: 0.5)
                )
                .padding(.bottom, 14)

                LCPrimaryButton(title: isFetchingOfferings ? "Loading…" : "Start free trial") {
                    Task { await startPremium() }
                }
                .disabled(isFetchingOfferings)

                Text("Cancel anytime. No charge until day 7.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.lcTextFaint)
                    .tracking(-0.1)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 10)
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 28)
            .padding(.top, 8)
        }
        .background(Color.lcBackground)
        .sheet(isPresented: $showPaywall, onDismiss: onComplete) {
            SubscriptionPaywallView(subscriptionService: subscriptionService)
                .environment(appState)
        }
    }

    private func startPremium() async {
        isFetchingOfferings = true
        try? await subscriptionService.fetchOfferings()
        isFetchingOfferings = false
        showPaywall = true
    }
}
