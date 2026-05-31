import SwiftUI

/// Collects the personal context injected into the coaching prompt.
/// Used both as an onboarding step and as an editor in Profile.
struct AboutYouView: View {
    var title: String = "About you"
    var subtitle: String = "This helps your coach personalize every check-in. You can change it anytime."
    var ctaTitle: String = "Save"
    var showSkip: Bool = false
    var onDone: () -> Void
    var onSkip: (() -> Void)? = nil

    @State private var name: String
    @State private var occupation: String
    @State private var bio: String
    @State private var motivation: String
    @State private var style: CoachingStyle
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""

    init(
        title: String = "About you",
        subtitle: String = "This helps your coach personalize every check-in. You can change it anytime.",
        ctaTitle: String = "Save",
        showSkip: Bool = false,
        name: String = "",
        occupation: String = "",
        bio: String = "",
        motivation: String = "",
        style: CoachingStyle = .balanced,
        onDone: @escaping () -> Void,
        onSkip: (() -> Void)? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.ctaTitle = ctaTitle
        self.showSkip = showSkip
        self.onDone = onDone
        self.onSkip = onSkip
        _name = State(initialValue: name)
        _occupation = State(initialValue: occupation)
        _bio = State(initialValue: bio)
        _motivation = State(initialValue: motivation)
        _style = State(initialValue: style)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text(title)
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(Color.lcText)
                        .tracking(-0.8)
                        .padding(.bottom, 12)

                    Text(subtitle)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.lcTextDim)
                        .tracking(-0.2)
                        .lineSpacing(4)
                        .padding(.bottom, 24)

                    field(label: "Your name", text: $name, placeholder: "First name", maxChars: 60)
                    field(label: "What you do", text: $occupation, placeholder: "e.g. Founder, student, nurse", maxChars: 120)
                    multilineField(label: "About you", text: $bio, placeholder: "A little context about your life right now…", maxChars: 300)
                    multilineField(label: "Your bigger why", text: $motivation, placeholder: "The deeper reason behind your goal…", maxChars: 300)

                    LCSectionLabel(title: "Coaching style")
                        .padding(.bottom, 10)
                    stylePicker
                        .padding(.bottom, 8)
                }
                .padding(.horizontal, 28)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }

            VStack(spacing: 10) {
                LCPrimaryButton(title: isSaving ? "Saving…" : ctaTitle, action: { Task { await save() } }, isDisabled: isSaving)

                if showSkip {
                    Button("Skip for now") { onSkip?() }
                        .font(.system(size: 15))
                        .foregroundStyle(Color.lcTextDim)
                        .disabled(isSaving)
                }
            }
            .padding(.horizontal, 28)
            .padding(.bottom, 8)
        }
        .background(Color.lcBackground)
        .alert("Couldn't save", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorMessage) }
    }

    private var stylePicker: some View {
        VStack(spacing: 8) {
            ForEach(CoachingStyle.allCases) { option in
                Button {
                    style = option
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: style == option ? "largecircle.fill.circle" : "circle")
                            .font(.system(size: 18))
                            .foregroundStyle(style == option ? Color.lcAccent : Color.lcTextFaint)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(option.label)
                                .font(.system(size: 15.5, weight: .medium))
                                .foregroundStyle(Color.lcText)
                            Text(option.blurb)
                                .font(.system(size: 13))
                                .foregroundStyle(Color.lcTextDim)
                        }
                        Spacer()
                    }
                    .padding(14)
                    .background(Color.lcSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(style == option ? Color.lcAccent.opacity(0.6) : Color.lcHairline, lineWidth: style == option ? 1 : 0.5)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func field(label: String, text: Binding<String>, placeholder: String, maxChars: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: label)
            TextField(placeholder, text: text)
                .font(.system(size: 17))
                .foregroundStyle(Color.lcText)
                .tint(Color.lcAccent)
                .padding(14)
                .background(Color.lcSurface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.lcHairline, lineWidth: 0.5))
                .onChange(of: text.wrappedValue) { _, new in
                    if new.count > maxChars { text.wrappedValue = String(new.prefix(maxChars)) }
                }
        }
        .padding(.bottom, 18)
    }

    private func multilineField(label: String, text: Binding<String>, placeholder: String, maxChars: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            LCSectionLabel(title: label)
            ZStack(alignment: .topLeading) {
                if text.wrappedValue.isEmpty {
                    Text(placeholder)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.lcTextFaint)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 22)
                }
                TextEditor(text: text)
                    .frame(minHeight: 84)
                    .scrollContentBackground(.hidden)
                    .font(.system(size: 16))
                    .foregroundStyle(Color.lcText)
                    .tint(Color.lcAccent)
                    .padding(8)
            }
            .background(Color.lcSurface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.lcHairline, lineWidth: 0.5))
            .onChange(of: text.wrappedValue) { _, new in
                if new.count > maxChars { text.wrappedValue = String(new.prefix(maxChars)) }
            }
        }
        .padding(.bottom, 18)
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        let update = ProfileUpdate(
            displayName: name.trimmingCharacters(in: .whitespacesAndNewlines),
            bio: bio.trimmingCharacters(in: .whitespacesAndNewlines),
            coachingStyle: style.rawValue,
            occupation: occupation.trimmingCharacters(in: .whitespacesAndNewlines),
            motivation: motivation.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        do {
            try await ProfileService.update(update)
            onDone()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
