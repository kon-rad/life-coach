import SwiftUI
import Speech
import AVFoundation

@MainActor
private final class SpeechInputManager: ObservableObject {
    @Published var isRecording = false
    @Published var isMicDenied = false
    @Published var isSpeechDenied = false
    @Published var transcribedText = ""

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    func toggle() async {
        if isRecording { stop() } else { await start() }
    }

    private func start() async {
        let speechStatus: SFSpeechRecognizerAuthorizationStatus = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { cont.resume(returning: $0) }
        }
        guard speechStatus == .authorized else {
            isSpeechDenied = speechStatus != .notDetermined
            return
        }
        let micGranted: Bool = await withCheckedContinuation { cont in
            AVAudioSession.sharedInstance().requestRecordPermission { cont.resume(returning: $0) }
        }
        guard micGranted else { isMicDenied = true; return }
        guard let recognizer, recognizer.isAvailable else { return }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch { return }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        audioEngine.prepare()
        do { try audioEngine.start() } catch { inputNode.removeTap(onBus: 0); return }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if let result { self.transcribedText = result.bestTranscription.formattedString }
                if result?.isFinal == true || error != nil { self.stop() }
            }
        }
        isRecording = true
    }

    func stop() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        recognitionTask?.cancel()
        recognitionTask = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

struct GoalInputView: View {
    let onGoalSubmitted: (String) -> Void

    @State private var goalText = ""
    @StateObject private var speechManager = SpeechInputManager()

    private static let maxChars = 200
    private let examples = [
        "Run a half marathon by April",
        "Finish my MBA application",
        "Write 500 words a day",
        "Sleep before 11pm",
    ]

    private var trimmedText: String { goalText.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("What's your goal?")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-0.8)
                        .padding(.bottom, 12)

                    Text("One thing you want to make progress on. We'll work on it together, daily.")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.2)
                        .lineSpacing(4)
                        .padding(.bottom, 24)

                    // Text input
                    ZStack(alignment: .topLeading) {
                        if goalText.isEmpty {
                            Text("e.g. Launch my side project by March 1…")
                                .font(.system(size: 17))
                                .foregroundStyle(Color.lcTextFaint)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 10)
                        }
                        TextEditor(text: $goalText)
                            .frame(minHeight: 96)
                            .scrollContentBackground(.hidden)
                            .font(.system(size: 17))
                            .foregroundStyle(Color.lcText)
                            .tint(Color.lcAccent)
                    }
                    .padding(14)
                    .background(Color.lcSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color.lcHairline, lineWidth: 0.5)
                    )
                    .padding(.bottom, 14)
                    .onChange(of: goalText) { _, new in
                        if new.count > Self.maxChars { goalText = String(new.prefix(Self.maxChars)) }
                    }
                    .onChange(of: speechManager.transcribedText) { _, text in
                        if !text.isEmpty { goalText = text }
                    }

                    // Voice input button
                    Button {
                        Task { await speechManager.toggle() }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: speechManager.isRecording ? "stop.circle" : "mic")
                                .font(.system(size: 16))
                                .foregroundStyle(Color.lcAccent)
                            Text(speechManager.isRecording ? "Stop recording" : "Speak your goal")
                                .font(.system(size: 15))
                                .foregroundStyle(Color.lcText)
                                .tracking(-0.2)
                        }
                        .padding(.horizontal, 14)
                        .frame(height: 44)
                        .background(Color.lcSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.lcHairline, lineWidth: 0.5)
                        )
                    }
                    .disabled(speechManager.isMicDenied || speechManager.isSpeechDenied)
                    .padding(.bottom, 22)

                    LCSectionLabel(title: "Try an example")
                        .padding(.bottom, 10)

                    // Example chips
                    FlowLayout(spacing: 8) {
                        ForEach(examples, id: \.self) { ex in
                            Button {
                                goalText = ex
                            } label: {
                                Text(ex)
                                    .font(.system(size: 13.5))
                                    .foregroundStyle(Color.lcTextDim)
                                    .tracking(-0.1)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(Color.lcSurface)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule().stroke(Color.lcHairline, lineWidth: 0.5)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 28)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }

            LCPrimaryButton(title: "Continue", action: { onGoalSubmitted(trimmedText) }, isDisabled: trimmedText.isEmpty)
                .padding(.horizontal, 28)
                .padding(.bottom, 8)
        }
        .background(Color.lcBackground)
    }
}

// Simple flow layout for wrapping chips
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var height: CGFloat = 0
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowWidth + size.width > width && rowWidth > 0 {
                height += rowHeight + spacing
                rowWidth = 0
                rowHeight = 0
            }
            rowWidth += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        height += rowHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX && x > bounds.minX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
