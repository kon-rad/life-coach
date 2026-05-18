import SwiftUI

struct CallsListView: View {
    let conversations: [Conversation]
    let chatService: ChatService
    @Binding var selectedConversation: Conversation?

    var body: some View {
        List(conversations) { conversation in
            Button {
                selectedConversation = conversation
            } label: {
                ConversationRowView(conversation: conversation)
            }
            .buttonStyle(.plain)
        }
        .listStyle(.plain)
    }
}

private struct ConversationRowView: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.title2)
                .foregroundStyle(Color.indigo)

            VStack(alignment: .leading, spacing: 2) {
                Text(callTypeLabel(conversation.type))
                    .font(.headline)

                Text(subtitleText)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let summary = conversation.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }

    private var iconName: String {
        switch conversation.type {
        case .freeChat: return "bubble.left.fill"
        default: return "mic.circle.fill"
        }
    }

    private var subtitleText: String {
        let dateStr = formattedDate(conversation.createdAt)
        if conversation.type == .freeChat {
            let count = conversation.messages.count
            return "\(dateStr) • \(count) message\(count == 1 ? "" : "s")"
        } else {
            let minutes = (conversation.durationSeconds ?? 0) / 60
            return "\(dateStr) • \(minutes) min"
        }
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
}
