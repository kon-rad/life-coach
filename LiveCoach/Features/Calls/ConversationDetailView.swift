import SwiftUI

struct ConversationDetailView: View {
    let conversation: Conversation
    let chatService: ChatService
    var score: Int? = nil

    @State private var messages: [Message] = []
    @State private var input = ""
    @State private var isStreaming = false
    @State private var showUpgradeAlert = false

    var body: some View {
        VStack(spacing: 0) {
            if let score {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundStyle(scoreColor(score))
                    Text("Day Score: \(score)/10")
                        .font(.subheadline.bold())
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
                .background(scoreColor(score).opacity(0.1))
                Divider()
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(messages) { message in
                            MessageBubble(
                                message: message,
                                showTyping: isStreaming && message.id == messages.last?.id
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                    Color.clear.frame(height: 1).id("chatBottom")
                }
                .onChange(of: messages.count) {
                    withAnimation { proxy.scrollTo("chatBottom") }
                }
                .onChange(of: messages.last?.content ?? "") {
                    proxy.scrollTo("chatBottom")
                }
            }

            if conversation.type == .freeChat {
                Divider()
                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Message your coach...", text: $input, axis: .vertical)
                        .lineLimit(1...5)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20))

                    Button(action: sendMessage) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(canSend ? Color.indigo : Color.secondary)
                    }
                    .disabled(!canSend)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
        .navigationTitle(callTypeLabel(conversation.type))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            messages = conversation.messages
        }
        .alert("Daily Limit Reached", isPresented: $showUpgradeAlert) {
            Button("Upgrade") { }
            Button("OK", role: .cancel) { }
        } message: {
            Text("You've reached your free limit of 10 messages today. Upgrade to Life Coach App Premium for unlimited chat.")
        }
    }

    private var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isStreaming
    }

    private func sendMessage() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isStreaming else { return }

        messages.append(Message(id: UUID().uuidString, role: .user, content: text, timestamp: Date()))
        input = ""
        messages.append(Message(id: UUID().uuidString, role: .assistant, content: "", timestamp: Date()))
        isStreaming = true

        Task {
            defer { isStreaming = false }
            do {
                for try await chunk in chatService.sendMessage(conversationId: conversation.id, text: text) {
                    guard !messages.isEmpty else { continue }
                    if let data = chunk.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let delta = json["delta"] as? String {
                        messages[messages.count - 1].content += delta
                    }
                }
                let updated = try await chatService.getConversation(id: conversation.id)
                messages = updated.messages
            } catch ChatError.dailyLimitReached {
                if messages.last?.role == .assistant && messages.last?.content.isEmpty == true {
                    messages.removeLast()
                }
                showUpgradeAlert = true
            } catch {
                if messages.last?.role == .assistant && messages.last?.content.isEmpty == true {
                    messages.removeLast()
                }
            }
        }
    }

    private func scoreColor(_ score: Int) -> Color {
        switch score {
        case 8...10: return .green
        case 5...7: return .orange
        default: return .red
        }
    }
}

private struct MessageBubble: View {
    let message: Message
    let showTyping: Bool

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack(alignment: .bottom) {
            if isUser { Spacer(minLength: 60) }

            Group {
                if showTyping && message.content.isEmpty {
                    ProgressView()
                        .padding(12)
                } else {
                    Text(message.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                }
            }
            .background(isUser ? Color.indigo : Color(.systemGray5))
            .foregroundStyle(isUser ? Color.white : Color.primary)
            .clipShape(RoundedRectangle(cornerRadius: 16))

            if !isUser { Spacer(minLength: 60) }
        }
    }
}
