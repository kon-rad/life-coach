import SwiftUI

struct VoiceCallView: View {
    let callType: ConversationType
    var voiceCallService: VoiceCallService

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) var appState
    @State private var isMuted = false
    @State private var elapsedSeconds = 0
    @State private var showToast = false
    @State private var dismissTask: Task<Void, Never>?
    @State private var voiceCallError: VoiceCallError?
    @State private var timerTask: Task<Void, Never>?

    private var callLabel: String {
        switch callType {
        case .morningCall: return "MORNING CALL"
        case .eveningCall: return "EVENING CALL"
        case .freeChat, .freeVoice: return "VOICE CALL"
        }
    }

    private var isActive: Bool { voiceCallService.callState == .active }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Radial accent glow
            RadialGradient(
                colors: [Color.lcAccent.opacity(isActive ? 0.22 : 0.10), Color.clear],
                center: .init(x: 0.5, y: 0.45),
                startRadius: 0,
                endRadius: 300
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.6), value: isActive)

            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Text(callLabel)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.5))
                        .tracking(1.2)

                    Text("Soularc")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(.white)
                        .tracking(-0.6)

                    Text(formatTime(elapsedSeconds))
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(.white.opacity(0.6))
                        .monospacedDigit()
                }
                .padding(.top, 28)

                Spacer()

                // Waveform center
                VStack(spacing: 18) {
                    LCWaveform(isActive: isActive && !isMuted, color: Color.lcAccent, barCount: 11)
                        .frame(width: 280, height: 72)

                    HStack(spacing: 8) {
                        Circle()
                            .fill(isMuted ? Color.lcRed : (isActive ? Color.lcGreen : Color.lcAccent))
                            .frame(width: 6, height: 6)
                        Text(statusText)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(0.5))
                            .tracking(1.6)
                    }
                }

                // Transcript preview (last 2 messages)
                if !voiceCallService.transcript.isEmpty {
                    VStack(spacing: 4) {
                        ForEach(voiceCallService.transcript.suffix(2)) { msg in
                            HStack {
                                if msg.role == .user { Spacer(minLength: 40) }
                                Text(msg.content)
                                    .font(.system(size: 15.5))
                                    .foregroundStyle(.white.opacity(msg.role == .user ? 0.6 : 0.9))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(.white.opacity(msg.role == .user ? 0.08 : 0.14))
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .lineLimit(2)
                                if msg.role == .assistant { Spacer(minLength: 40) }
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                }

                Spacer()

                // Controls row
                HStack(spacing: 0) {
                    callControlButton(
                        icon: isMuted ? "mic.slash" : "mic",
                        label: isMuted ? "Unmute" : "Mute",
                        isHighlighted: isMuted
                    ) {
                        isMuted.toggle()
                        voiceCallService.setMuted(isMuted)
                    }

                    Spacer()

                    Button {
                        Task { await voiceCallService.endCall() }
                    } label: {
                        ZStack {
                            Circle()
                                .fill(Color.lcRed)
                                .frame(width: 72, height: 72)
                                .shadow(color: Color.lcRed.opacity(0.4), radius: 16, y: 6)
                            Image(systemName: "phone.down.fill")
                                .font(.system(size: 26))
                                .foregroundStyle(.white)
                        }
                    }
                    .disabled(voiceCallService.callState == .ending || voiceCallService.callState == .ended)

                    Spacer()

                    callControlButton(icon: "speaker.wave.2", label: "Speaker", isHighlighted: false) {}
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 56)
                .padding(.top, 20)
            }

            // Toast
            if showToast {
                VStack {
                    Spacer()
                    Text("Check-in saved! Your micro-actions will appear shortly.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                        .background(Color.lcSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.lcHairline, lineWidth: 0.5)
                        )
                        .padding(.horizontal, 24)
                        .padding(.bottom, 100)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .task {
            timerTask = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    elapsedSeconds += 1
                }
            }

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
        .alert("No Voice Minutes Remaining", isPresented: Binding(
            get: { voiceCallError == .quotaExceeded },
            set: { if !$0 { voiceCallError = nil } }
        )) {
            Button("Go to Profile") { dismiss() }
            Button("Cancel", role: .cancel) { dismiss() }
        } message: {
            Text("You've used all your voice minutes this week. Buy more in Profile.")
        }
        .alert("Subscription Required", isPresented: Binding(
            get: { voiceCallError == .notAvailableOnFreeTier },
            set: { if !$0 { voiceCallError = nil } }
        )) {
            Button("Upgrade") { dismiss() }
            Button("Cancel", role: .cancel) { dismiss() }
        } message: {
            Text("Voice calls require a Soularc subscription.")
        }
        .alert("Voice Calls Coming Soon", isPresented: Binding(
            get: { voiceCallError == .unavailable },
            set: { if !$0 { voiceCallError = nil } }
        )) {
            Button("OK", role: .cancel) { dismiss() }
        } message: {
            Text("In-app voice calls aren't available yet. You can keep using text chat with your coach in the meantime.")
        }
        .onChange(of: voiceCallService.callState) { _, newState in
            if newState == .ended {
                timerTask?.cancel()
                withAnimation { showToast = true }
                dismissTask = Task {
                    try? await Task.sleep(for: .seconds(1.5))
                    dismiss()
                }
            }
        }
        .onDisappear {
            timerTask?.cancel()
            dismissTask?.cancel()
        }
    }

    private var statusText: String {
        if isMuted { return "MUTED" }
        switch voiceCallService.callState {
        case .idle: return "WAITING"
        case .connecting: return "CONNECTING"
        case .active: return "LISTENING"
        case .ending: return "ENDING"
        case .ended: return "ENDED"
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        "\(seconds / 60):\(String(format: "%02d", seconds % 60))"
    }

    @ViewBuilder
    private func callControlButton(
        icon: String, label: String, isHighlighted: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(isHighlighted ? .white : .white.opacity(0.14))
                        .frame(width: 62, height: 62)
                        .overlay(Circle().stroke(.white.opacity(0.2), lineWidth: 0.5))
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundStyle(isHighlighted ? Color.black : Color.white)
                }
                Text(label)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.6))
            }
        }
        .buttonStyle(.plain)
    }
}
