import SwiftUI

struct MicroActionRowView: View {
    let action: MicroAction
    let onToggle: (Bool) -> Void
    var isLast: Bool = false
    @State private var localCompleted: Bool

    init(action: MicroAction, isLast: Bool = false, onToggle: @escaping (Bool) -> Void) {
        self.action = action
        self.isLast = isLast
        self.onToggle = onToggle
        _localCompleted = State(initialValue: action.isCompleted)
    }

    var body: some View {
        Button {
            localCompleted.toggle()
            onToggle(localCompleted)
        } label: {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    Circle()
                        .stroke(localCompleted ? Color.lcAccent : Color.lcHairlineStrong, lineWidth: 1.5)
                        .frame(width: 24, height: 24)
                    if localCompleted {
                        Circle()
                            .fill(Color.lcAccent)
                            .frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .padding(.top, 1)

                Text(action.title)
                    .font(.system(size: 15.5, weight: .medium))
                    .foregroundStyle(localCompleted ? Color.lcText.opacity(0.45) : Color.lcText)
                    .strikethrough(localCompleted, color: Color.lcText.opacity(0.45))
                    .tracking(-0.2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, 16)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            if !isLast { Color.lcHairline.frame(height: 0.5) }
        }
        .onChange(of: action.isCompleted) { _, newValue in
            localCompleted = newValue
        }
    }
}
