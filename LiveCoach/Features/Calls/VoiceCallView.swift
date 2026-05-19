import SwiftUI

struct VoiceCallView: View {
    let callType: ConversationType
    var voiceCallService: VoiceCallService

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) var appState
    @State private var pulse = false
    @State private var showToast = false
    @State private var dismissTask: Task<Void, Never>?
    @State private var voiceCallError: VoiceCallError?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.top, 20)
                    .padding(.horizontal, 24)

                Spacer()

                waveformSection

                Spacer()

                transcriptSection
                    .padding(.horizontal, 16)
                    .frame(maxHeight: 200)

                statusLabel
                    .padding(.top, 12)

                if voiceCallService.callState == .active {
                    Text("Tap end when finished")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                        .padding(.top, 6)
                }

                endCallButton
                    .padding(.top, 24)
                    .padding(.bottom, 48)
            }

            if showToast {
                VStack {
                    Spacer()
                    toastBanner
                        .padding(.bottom, 100)
                }
            }
        }
        .task {
            do {
                try await voiceCallService.startCall(
                    type: callType,
                    isPremium: appState.isPremium,
                    voiceMinutesRemaining: appState.userStats?.voiceMinutesRemainingThisWeek ?? 0
                )
            } catch let err as VoiceCallError {
                voiceCallError = err
            } catch {
                voiceCallService.error = error
            }
        }
        .alert(
            "No Voice Minutes Remaining",
            isPresented: Binding(
                get: { voiceCallError == .quotaExceeded },
                set: { if !$0 { voiceCallError = nil } }
            )
        ) {
            Button("Go to Profile") { dismiss() }
            Button("Cancel", role: .cancel) { dismiss() }
        } message: {
            Text("You've used all your voice minutes this week. Buy more in Profile.")
        }
        .alert(
            "Subscription Required",
            isPresented: Binding(
                get: { voiceCallError == .notAvailableOnFreeTier },
                set: { if !$0 { voiceCallError = nil } }
            )
        ) {
            Button("Upgrade") { dismiss() }
            Button("Cancel", role: .cancel) { dismiss() }
        } message: {
            Text("Voice calls require a Live Coach subscription.")
        }
        .onChange(of: voiceCallService.callState) { _, newState in
            if newState == .ended {
                withAnimation { showToast = true }
                dismissTask = Task {
                    try? await Task.sleep(for: .seconds(1.5))
                    dismiss()
                }
            }
        }
        .onDisappear {
            dismissTask?.cancel()
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(callTitle)
                    .font(.title2)
                    .bold()
                    .foregroundStyle(.white)
            }
            Spacer()
        }
    }

    private var callTitle: String {
        switch callType {
        case .morningCall: return "Morning Check-in"
        case .eveningCall: return "Evening Check-in"
        case .freeChat, .freeVoice: return "Voice Chat"
        }
    }

    private var waveformSection: some View {
        Image(systemName: "waveform")
            .font(.system(size: 80))
            .foregroundStyle(.white.opacity(0.85))
            .scaleEffect(pulse ? 1.15 : 1.0)
            .animation(
                voiceCallService.callState == .active
                    ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: pulse
            )
            .onChange(of: voiceCallService.callState) { _, state in
                pulse = state == .active
            }
            .onAppear {
                pulse = voiceCallService.callState == .active
            }
    }

    private var transcriptSection: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 8) {
                    let recent = Array(voiceCallService.transcript.suffix(5))
                    ForEach(recent) { message in
                        messageBubble(message)
                            .id(message.id)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .onChange(of: voiceCallService.transcript.count) { _, _ in
                if let last = voiceCallService.transcript.suffix(5).last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private func messageBubble(_ message: Message) -> some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            Text(message.content)
                .font(.caption)
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    message.role == .user
                        ? Color.accentColor.opacity(0.8)
                        : Color.white.opacity(0.15)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            if message.role == .assistant { Spacer(minLength: 40) }
        }
    }

    private var statusLabel: some View {
        Text(statusText)
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.7))
    }

    private var statusText: String {
        switch voiceCallService.callState {
        case .idle: return ""
        case .connecting: return "Connecting..."
        case .active: return "Listening..."
        case .ending: return "Ending call..."
        case .ended: return "Call ended"
        }
    }

    private var endCallButton: some View {
        Button {
            Task { await voiceCallService.endCall() }
        } label: {
            ZStack {
                Circle()
                    .fill(Color.red)
                    .frame(width: 72, height: 72)
                Image(systemName: "xmark")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .disabled(voiceCallService.callState == .ending || voiceCallService.callState == .ended)
    }

    private var toastBanner: some View {
        Text("Check-in saved! Your micro-actions will appear shortly.")
            .font(.subheadline)
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color(.darkGray).opacity(0.95))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(radius: 8)
            .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
