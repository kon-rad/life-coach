import SwiftUI

struct ConversationDetailView: View {
    let conversation: Conversation
    let chatService: ChatService

    var body: some View {
        Text(callTypeLabel(conversation.type))
            .navigationTitle(callTypeLabel(conversation.type))
            .navigationBarTitleDisplayMode(.inline)
    }
}
