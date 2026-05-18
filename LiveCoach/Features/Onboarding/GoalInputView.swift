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
        if isRecording {
            stop()
        } else {
            await start()
        }
    }

    private func start() async {
        let speechStatus: SFSpeechRecognizerAuthorizationStatus = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status)
            }
        }
        guard speechStatus == .authorized else {
            isSpeechDenied = speechStatus != .notDetermined
            return
        }

        let micGranted: Bool = await withCheckedContinuation { cont in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                cont.resume(returning: granted)
            }
        }
        guard micGranted else {
            isMicDenied = true
            return
        }

        guard let recognizer, recognizer.isAvailable else { return }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            inputNode.removeTap(onBus: 0)
            return
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if let result {
                    self.transcribedText = result.bestTranscription.formattedString
                }
                if result?.isFinal == true || error != nil {
                    self.stop()
                }
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
        "Start a business", "Get fit", "Learn a skill",
        "Find a relationship", "Get a new job"
    ]

    private var trimmedText: String {
        goalText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var micButtonColor: Color {
        if speechManager.isMicDenied || speechManager.isSpeechDenied { return .secondary }
        return speechManager.isRecording ? .red : .accentColor
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("What do you want to work on?")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.top, 32)

                    Text("This is your one project. You can update it anytime.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    ZStack(alignment: .topLeading) {
                        if goalText.isEmpty {
                            Text("Describe your goal…")
                                .foregroundStyle(.tertiary)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 8)
                        }
                        TextEditor(text: $goalText)
                            .frame(minHeight: 120)
                            .scrollContentBackground(.hidden)
                    }
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(10)
                    .onChange(of: goalText) { _, new in
                        if new.count > Self.maxChars {
                            goalText = String(new.prefix(Self.maxChars))
                        }
                    }

                    HStack {
                        Spacer()
                        Text("\(goalText.count) / \(Self.maxChars)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Button {
                        Task { await speechManager.toggle() }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: speechManager.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                                .font(.title2)
                                .foregroundColor(micButtonColor)
                            Text(speechManager.isRecording ? "Stop recording" : "Dictate goal")
                                .font(.subheadline)
                                .foregroundColor(speechManager.isMicDenied || speechManager.isSpeechDenied ? .secondary : .primary)
                        }
                    }
                    .disabled(speechManager.isMicDenied || speechManager.isSpeechDenied)

                    if speechManager.isMicDenied || speechManager.isSpeechDenied {
                        Text("Microphone or speech access denied. Enable in Settings.")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Text("Examples")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(examples, id: \.self) { chip in
                                Button {
                                    goalText = chip
                                } label: {
                                    Text(chip)
                                        .font(.subheadline)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(Color(.secondarySystemBackground))
                                        .foregroundColor(.primary)
                                        .clipShape(Capsule())
                                        .overlay(Capsule().stroke(Color(.separator), lineWidth: 1))
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(.horizontal, 24)
            }
            .onChange(of: speechManager.transcribedText) { _, text in
                if !text.isEmpty {
                    goalText = text
                }
            }

            Button {
                onGoalSubmitted(trimmedText)
            } label: {
                Text("This is my goal →")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(trimmedText.isEmpty ? Color.secondary : Color.accentColor)
                    .cornerRadius(14)
            }
            .disabled(trimmedText.isEmpty)
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
            .padding(.top, 16)
        }
        .background(.background)
    }
}
