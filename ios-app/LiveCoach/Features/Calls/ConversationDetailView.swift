import SwiftUI
import AVFoundation

struct ConversationDetailView: View {
    let conversation: Conversation
    let chatService: ChatService
    var score: Int? = nil

    @State private var messages: [Message] = []
    @State private var summaryText: String = ""
    @State private var recordingURLString: String = ""
    @State private var actions: [CoachAction] = []
    @State private var input = ""
    @State private var isStreaming = false
    @State private var showUpgradeAlert = false

    private var isTextChat: Bool { conversation.type == .freeChat }
    private var recordingURL: URL? {
        recordingURLString.isEmpty ? nil : URL(string: recordingURLString)
    }
    private var hasHeader: Bool {
        !summaryText.isEmpty || recordingURL != nil || !actions.isEmpty
    }

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
                        headerSections
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
                    if isTextChat { withAnimation { proxy.scrollTo("chatBottom") } }
                }
                .onChange(of: messages.last?.content ?? "") {
                    if isTextChat { proxy.scrollTo("chatBottom") }
                }
            }

            if isTextChat {
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
        .task {
            // The conversation passed in comes from the list endpoint, which omits messages,
            // recording, and actions. Seed from what we have, then load the full detail.
            applyDetail(conversation)
            if let full = try? await chatService.getConversation(id: conversation.id) {
                applyDetail(full)
            }
        }
        .alert("Daily Limit Reached", isPresented: $showUpgradeAlert) {
            Button("Upgrade") { }
            Button("OK", role: .cancel) { }
        } message: {
            Text("You've reached your free limit of 10 messages today. Upgrade to Soularc Plus for unlimited chat.")
        }
    }

    @ViewBuilder
    private var headerSections: some View {
        if !summaryText.isEmpty {
            SummaryCard(text: summaryText)
        }
        if let recordingURL {
            RecordingPlayerView(url: recordingURL)
        }
        if !actions.isEmpty {
            CoachActionsCard(actions: actions)
        }
        if hasHeader && !messages.isEmpty {
            Text("Transcript")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.lcTextDim)
                .padding(.top, 8)
        }
    }

    private func applyDetail(_ c: Conversation) {
        messages = c.messages
        summaryText = c.summary ?? ""
        recordingURLString = c.recordingUrl ?? ""
        actions = c.actions ?? []
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

// MARK: - Summary

private struct SummaryCard: View {
    let text: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Summary", systemImage: "text.alignleft")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.lcAccent)
            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(Color.lcText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.lcAccentSofter, in: RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Coach actions

private struct CoachActionsCard: View {
    let actions: [CoachAction]
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("What the coach did", systemImage: "checklist")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.lcAccent)
            ForEach(actions) { action in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 5))
                        .foregroundStyle(Color.lcAccent)
                        .padding(.top, 6)
                    Text(action.detail)
                        .font(.system(size: 14))
                        .foregroundStyle(Color.lcText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Recording player

/// Compact audio player for a VAPI call recording. Creates the AVPlayer lazily on first
/// play and polls position with a SwiftUI timer (no AVPlayer observers → no Sendable issues).
private struct RecordingPlayerView: View {
    let url: URL

    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var current: Double = 0
    @State private var duration: Double = 0
    @State private var scrubbing = false

    private let ticker = Timer.publish(every: 0.3, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Recording", systemImage: "waveform")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.lcAccent)

            HStack(spacing: 12) {
                Button(action: toggle) {
                    Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 38))
                        .foregroundStyle(Color.lcAccent)
                }
                .buttonStyle(.plain)

                VStack(spacing: 2) {
                    Slider(
                        value: $current,
                        in: 0...(max(duration, 0.1)),
                        onEditingChanged: { editing in
                            scrubbing = editing
                            if !editing { seek(to: current) }
                        }
                    )
                    .tint(Color.lcAccent)
                    HStack {
                        Text(timeString(current))
                        Spacer()
                        Text(duration > 0 ? timeString(duration) : "--:--")
                    }
                    .font(.system(size: 11).monospacedDigit())
                    .foregroundStyle(Color.lcTextFaint)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
        .onReceive(ticker) { _ in tick() }
        .onDisappear { player?.pause() }
    }

    private func toggle() {
        let p = preparedPlayer()
        if isPlaying {
            p.pause()
            isPlaying = false
        } else {
            try? AVAudioSession.sharedInstance().setCategory(.playback)
            try? AVAudioSession.sharedInstance().setActive(true)
            p.play()
            isPlaying = true
        }
    }

    private func preparedPlayer() -> AVPlayer {
        if let player { return player }
        let p = AVPlayer(url: url)
        player = p
        return p
    }

    private func seek(to seconds: Double) {
        player?.seek(to: CMTime(seconds: seconds, preferredTimescale: 600))
    }

    private func tick() {
        guard let player, !scrubbing else { return }
        current = player.currentTime().seconds
        if let d = player.currentItem?.duration.seconds, d.isFinite, d > 0 {
            duration = d
        }
        if duration > 0, current >= duration - 0.25, isPlaying {
            player.pause()
            player.seek(to: .zero)
            current = 0
            isPlaying = false
        }
    }

    private func timeString(_ seconds: Double) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "0:00" }
        let s = Int(seconds.rounded())
        return String(format: "%d:%02d", s / 60, s % 60)
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
