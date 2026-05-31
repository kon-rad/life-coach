import SwiftUI

struct CallsView: View {
    @Environment(AppState.self) var appState
    @State private var chatService = ChatService()
    @State private var showNewConversation = false
    @State private var selectedConversation: Conversation?
    @State private var showVoiceCall = false
    @State private var voiceCallService = VoiceCallService()

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(spacing: 0) {
                    if chatService.conversations.isEmpty && !chatService.isLoading {
                        emptyState
                    } else {
                        conversationList
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            }
            .background(Color.lcBackground)

            // Floating action button
            Button { showNewConversation = true } label: {
                ZStack {
                    Circle()
                        .fill(Color.lcAccent)
                        .frame(width: 56, height: 56)
                        .shadow(color: Color.lcAccent.opacity(0.45), radius: 16, y: 6)
                    Image(systemName: "plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .buttonStyle(.plain)
            .padding(.trailing, 20)
            .padding(.bottom, 90)
        }
        .sheet(isPresented: $showNewConversation) {
            NewConversationSheet(
                chatService: chatService,
                showSheet: $showNewConversation,
                selectedConversation: $selectedConversation,
                showVoiceCall: $showVoiceCall
            )
            .presentationDetents([.height(300)])
            .presentationBackground(Color.lcSurface)
            .presentationCornerRadius(24)
        }
        .navigationDestination(isPresented: Binding(
            get: { selectedConversation != nil },
            set: { if !$0 { selectedConversation = nil } }
        )) {
            if let conversation = selectedConversation {
                ConversationDetailView(conversation: conversation, chatService: chatService)
            }
        }
        .navigationDestination(isPresented: $showVoiceCall) {
            VoiceCallView(callType: .freeVoice, voiceCallService: voiceCallService)
        }
        .task {
            try? await chatService.loadConversations()
        }
    }

    // MARK: - Conversation List

    private var conversationList: some View {
        LCCard(padding: 0) {
            VStack(spacing: 0) {
                ForEach(Array(chatService.conversations.enumerated()), id: \.element.id) { idx, convo in
                    conversationRow(
                        convo: convo,
                        isLast: idx == chatService.conversations.count - 1
                    )
                }
            }
        }
        .padding(.top, 4)
    }

    private func conversationRow(convo: Conversation, isLast: Bool) -> some View {
        let isVoice = [ConversationType.morningCall, .eveningCall, .freeVoice].contains(convo.type)

        return Button {
            selectedConversation = convo
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.lcAccentSofter)
                        .frame(width: 40, height: 40)
                    Image(systemName: isVoice ? "waveform" : "bubble.left")
                        .font(.system(size: 17))
                        .foregroundStyle(Color.lcAccent)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text(callTypeLabel(convo.type))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.lcText)
                            .tracking(-0.2)
                        Spacer()
                        Text(relativeDate(convo.createdAt))
                            .font(.system(size: 12))
                            .foregroundStyle(Color.lcTextFaint)
                            .tracking(-0.1)
                    }
                    if let summary = convo.summary, !summary.isEmpty {
                        Text(summary)
                            .font(.system(size: 13.5))
                            .foregroundStyle(Color.lcTextDim)
                            .tracking(-0.1)
                            .lineLimit(1)
                    }
                    Text(conversationSubtitle(convo))
                        .font(.system(size: 11.5))
                        .foregroundStyle(Color.lcTextFaint)
                        .padding(.top, 2)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.lcTextFaint)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .overlay(alignment: .bottom) {
                if !isLast { Color.lcHairline.frame(height: 0.5) }
            }
        }
        .buttonStyle(.plain)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "waveform")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Color.lcTextFaint)
                .padding(.top, 60)
            Text("No conversations yet")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.lcText)
            Text("Tap + to start a voice call or text chat.")
                .font(.system(size: 14))
                .foregroundStyle(Color.lcTextDim)
        }
        .frame(maxWidth: .infinity)
    }

    private func relativeDate(_ date: Date?) -> String {
        guard let date else { return "" }
        let cal = Calendar.current
        if cal.isDateInToday(date) { return "Today" }
        if cal.isDateInYesterday(date) { return "Yesterday" }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: date)
    }

    private func conversationSubtitle(_ convo: Conversation) -> String {
        let count = convo.displayMessageCount
        let msgs = "\(count) message\(count == 1 ? "" : "s")"
        if convo.type == .freeChat { return msgs }
        if let secs = convo.durationSeconds, secs > 0 {
            return "\(secs / 60) min • \(msgs)"
        }
        return msgs
    }
}

func callTypeLabel(_ type: ConversationType) -> String {
    switch type {
    case .morningCall:  return "Voice call"
    case .eveningCall:  return "Voice call"
    case .freeChat:     return "Text chat"
    case .freeVoice:    return "Voice call"
    }
}
