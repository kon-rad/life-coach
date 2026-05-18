import SwiftUI

struct MicroActionRowView: View {
    let action: MicroAction
    let onToggle: (Bool) -> Void
    @State private var localCompleted: Bool

    init(action: MicroAction, onToggle: @escaping (Bool) -> Void) {
        self.action = action
        self.onToggle = onToggle
        _localCompleted = State(initialValue: action.isCompleted)
    }

    var body: some View {
        HStack(spacing: 12) {
            Button {
                localCompleted.toggle()
                onToggle(localCompleted)
            } label: {
                Image(systemName: localCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(localCompleted ? Color.accentColor : Color.secondary)
                    .font(.title3)
            }
            .buttonStyle(.plain)

            Text(action.title)
                .strikethrough(localCompleted)
                .foregroundStyle(localCompleted ? .secondary : .primary)

            Spacer()
        }
        .padding(.vertical, 4)
        .onChange(of: action.isCompleted) { _, newValue in
            localCompleted = newValue
        }
    }
}
