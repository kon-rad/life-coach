import SwiftUI

struct CallsView: View {
    @State private var chatService = ChatService()
    @State private var filter = "All"
    @State private var showNewConversation = false
    @State private var selectedConversation: Conversation?
    @State private var showVoiceCall = false
    @State private var voiceCallService = VoiceCallService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $filter) {
                    ForEach(["All", "Voice", "Chat"], id: \.self) { Text($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                CallsListView(
                    conversations: filteredConversations,
                    chatService: chatService,
                    selectedConversation: $selectedConversation
                )
            }
            .navigationTitle("Conversations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showNewConversation = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showNewConversation) {
                NewConversationSheet(
                    chatService: chatService,
                    showSheet: $showNewConversation,
                    selectedConversation: $selectedConversation,
                    showVoiceCall: $showVoiceCall
                )
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
    }

    private var filteredConversations: [Conversation] {
        switch filter {
        case "Voice":
            return chatService.conversations.filter {
                [.morningCall, .eveningCall, .freeVoice].contains($0.type)
            }
        case "Chat":
            return chatService.conversations.filter { $0.type == .freeChat }
        default:
            return chatService.conversations
        }
    }
}

func callTypeLabel(_ type: ConversationType) -> String {
    switch type {
    case .morningCall: return "Morning check-in"
    case .eveningCall: return "Evening check-in"
    case .freeChat: return "Free chat"
    case .freeVoice: return "Free voice call"
    }
}
