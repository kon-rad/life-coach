import SwiftUI
import UIKit

/// Whether the in-call screen shows the voice animation or the full text transcript.
enum CallDisplayMode: String, CaseIterable {
    case voice, text
    var label: String { self == .voice ? "Voice" : "Text" }
    var icon: String { self == .voice ? "waveform" : "text.bubble" }
}

struct VoiceCallView: View {
    let callType: CoachCallType
    var voiceCallService: VoiceCallService

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) var appState
    @State private var isMuted = false
    @State private var elapsedSeconds = 0
    @State private var showToast = false
    @State private var dismissTask: Task<Void, Never>?
    @State private var voiceCallError: VoiceCallError?
    @State private var showConnectError = false
    @State private var timerTask: Task<Void, Never>?
    @State private var displayMode: CallDisplayMode = .voice

    private var callLabel: String {
        switch callType {
        case .midday: return "MIDDAY CHECK-IN"
        case .evening: return "EVENING DEBRIEF"
        case .weekly: return "WEEKLY PLANNING"
        case .free: return "VOICE CALL"
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

                    if let remaining = liveRemainingMinutes {
                        Text(remaining > 0
                             ? "\(remaining) min left this week"
                             : "Weekly minutes used up")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(remaining > 0 ? .white.opacity(0.35) : Color.lcRed.opacity(0.8))
                            .tracking(0.3)
                    }
                }
                .padding(.top, 28)

                // Content area — voice animation or full text transcript.
                Group {
                    switch displayMode {
                    case .voice: voiceContent
                    case .text: textContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Voice / Text toggle
                displayModeToggle
                    .padding(.bottom, 4)

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
                    Text(toastMessage)
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
                    hasActivePlan: appState.hasActivePlan
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
        .alert("Microphone Access Needed", isPresented: Binding(
            get: { voiceCallError == .microphoneDenied },
            set: { if !$0 { voiceCallError = nil } }
        )) {
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
                dismiss()
            }
            Button("Cancel", role: .cancel) { dismiss() }
        } message: {
            Text("Soularc needs microphone access for voice check-ins. Enable it in Settings, then try again.")
        }
        .alert("Couldn't start the call", isPresented: $showConnectError) {
            Button("OK") { dismiss() }
        } message: {
            Text(connectErrorMessage)
        }
        .onChange(of: voiceCallService.callState) { _, newState in
            if newState == .ended {
                timerTask?.cancel()
                if voiceCallService.error != nil {
                    // Failed to connect — show why instead of the success toast.
                    showConnectError = true
                } else {
                    withAnimation { showToast = true }
                    dismissTask = Task {
                        try? await Task.sleep(for: .seconds(1.5))
                        dismiss()
                    }
                }
            }
        }
        .onDisappear {
            timerTask?.cancel()
            dismissTask?.cancel()
        }
    }

    /// Tailors the connect-failure copy to the actual cause so a server outage or timeout
    /// no longer masquerades as a microphone problem (which previously hid a proxy 500).
    private var connectErrorMessage: String {
        if let apiError = voiceCallService.error as? APIError {
            switch apiError {
            case .httpError, .unauthorized, .invalidURL, .noAuthToken:
                return "We couldn't reach the coaching server. Check your connection and try again in a moment."
            case .decodingError:
                return "The coaching server returned an unexpected response. Please try again."
            }
        }
        let nsError = voiceCallService.error as NSError?
        if nsError?.domain == "VoiceCall" && nsError?.code == -1001 {
            return "The call timed out before connecting. Please check your connection and try again."
        }
        return "We couldn't connect your call. Make sure you're online and that microphone access is enabled for Soularc in Settings, then try again."
    }

    private var toastMessage: String {
        switch callType {
        case .midday, .evening: return "Check-in saved! Your tasks will appear shortly."
        case .weekly: return "Weekly plan saved! Your tasks are set."
        case .free: return "Call saved."
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

    /// Whole minutes of weekly quota left right now: the balance at call start minus the
    /// time already spent on this call. `nil` until the proxy reports the starting balance.
    private var liveRemainingMinutes: Int? {
        guard let start = voiceCallService.remainingSecondsAtStart else { return nil }
        return max(0, start - elapsedSeconds) / 60
    }

    // MARK: - Voice content (animation only)

    @ViewBuilder
    private var voiceContent: some View {
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
    }

    // MARK: - Text content (full transcript)

    @ViewBuilder
    private var textContent: some View {
        if voiceCallService.transcript.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "text.bubble")
                    .font(.system(size: 30))
                    .foregroundStyle(.white.opacity(0.25))
                Text("Your conversation will appear here as you talk.")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.4))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 48)
            }
        } else {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(voiceCallService.transcript) { msg in
                            messageBubble(msg)
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                }
                .onChange(of: voiceCallService.transcript.count) { _, _ in
                    withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo("bottom", anchor: .bottom) }
                }
                .onChange(of: voiceCallService.transcript.last?.content) { _, _ in
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
        }
    }

    @ViewBuilder
    private func messageBubble(_ msg: Message) -> some View {
        HStack {
            if msg.role == .user { Spacer(minLength: 44) }
            Text(msg.content)
                .font(.system(size: 15.5))
                .foregroundStyle(.white.opacity(msg.role == .user ? 0.7 : 0.95))
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.white.opacity(msg.role == .user ? 0.08 : 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .frame(maxWidth: .infinity, alignment: msg.role == .user ? .trailing : .leading)
            if msg.role == .assistant { Spacer(minLength: 44) }
        }
    }

    // MARK: - Voice / Text toggle

    @ViewBuilder
    private var displayModeToggle: some View {
        HStack(spacing: 4) {
            ForEach(CallDisplayMode.allCases, id: \.self) { mode in
                let selected = displayMode == mode
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { displayMode = mode }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: mode.icon)
                            .font(.system(size: 12, weight: .semibold))
                        Text(mode.label)
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(selected ? Color.black : .white.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(selected ? Color.white : Color.clear)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(.white.opacity(0.1))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.12), lineWidth: 0.5))
        .frame(width: 220)
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
