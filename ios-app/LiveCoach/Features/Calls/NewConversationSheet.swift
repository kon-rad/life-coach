import SwiftUI

struct NewConversationSheet: View {
    let chatService: ChatService
    let hasActivePlan: Bool
    @Binding var showSheet: Bool
    @Binding var selectedConversation: Conversation?
    @Binding var showVoiceCall: Bool
    @Binding var selectedCallType: CoachCallType
    @Environment(SubscriptionService.self) private var subscriptionService
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                ForEach(CoachCallType.allCases) { callType in
                    ConversationTypeCard(
                        icon: "mic.circle.fill",
                        title: callType.label,
                        subtitle: "Talk with your AI coach • uses voice minutes"
                    ) {
                        // Gate before presenting so non-subscribers see the paywall,
                        // never a dead "WAITING" call screen.
                        guard hasActivePlan else { showPaywall = true; return }
                        selectedCallType = callType
                        showSheet = false
                        showVoiceCall = true
                    }
                }

                ConversationTypeCard(
                    icon: "bubble.left.fill",
                    title: "Text chat",
                    subtitle: "Type with your AI coach • unlimited on premium"
                ) {
                    Task {
                        if let conv = try? await chatService.createConversation(type: .freeChat) {
                            showSheet = false
                            selectedConversation = conv
                        }
                    }
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Start a conversation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showSheet = false
                    }
                }
            }
            .sheet(isPresented: $showPaywall) {
                SubscriptionPaywallView(subscriptionService: subscriptionService)
            }
        }
    }
}

private struct ConversationTypeCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.largeTitle)
                    .foregroundStyle(Color.indigo)
                    .frame(width: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}
