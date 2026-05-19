import SwiftUI

struct ErrorBanner: View {
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.white)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.white)
                .lineLimit(2)
            Spacer()
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(.white)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.red)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}
