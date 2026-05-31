import SwiftUI
import AuthenticationServices
import FirebaseAuth
import CryptoKit

struct SignInView: View {
    let onSignedIn: () -> Void

    @State private var authService = AuthService()
    @State private var error: Error?
    @State private var showError = false
    @State private var currentNonce: String?

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(alignment: .leading, spacing: 0) {
                Text("Sign in.")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(Color.lcText)
                    .tracking(-0.8)
                    .padding(.bottom, 12)

                Text("We use your account only for sync. Your conversations stay private.")
                    .font(.system(size: 16))
                    .foregroundStyle(Color.lcTextDim)
                    .tracking(-0.2)
                    .lineSpacing(4)
                    .padding(.bottom, 32)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            VStack(spacing: 12) {
                // Apple Sign In — styled per design (dark pill)
                SignInWithAppleButton(.continue) { request in
                    let nonce = randomNonceString()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName, .email]
                    request.nonce = sha256(nonce)
                } onCompletion: { result in
                    Task { @MainActor in await handleAppleSignIn(result) }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 54)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                // Google Sign In
                Button {
                    Task { @MainActor in await handleGoogleSignIn() }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "globe")
                            .font(.system(size: 17))
                        Text("Continue with Google")
                            .font(.system(size: 17, weight: .medium))
                            .tracking(-0.2)
                    }
                    .foregroundStyle(Color.lcText)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.lcSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.lcHairlineStrong, lineWidth: 0.5)
                    )
                }
                .buttonStyle(.plain)

                Text("By continuing you agree to our Terms and Privacy Policy.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.lcTextFaint)
                    .tracking(-0.1)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)
                    .padding(.bottom, 8)
            }
        }
        .padding(.horizontal, 28)
        .background(Color.lcBackground)
        .alert("Sign In Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(error?.localizedDescription ?? "An error occurred")
        }
    }

    @MainActor
    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let token = String(data: tokenData, encoding: .utf8),
                  let nonce = currentNonce else {
                error = URLError(.badServerResponse)
                showError = true
                return
            }
            let firebaseCredential = OAuthProvider.appleCredential(
                withIDToken: token,
                rawNonce: nonce,
                fullName: credential.fullName
            )
            do {
                try await Auth.auth().signIn(with: firebaseCredential)
                try? await ProxyAPIClient.shared.postEmpty("/auth/init")
                onSignedIn()
            } catch let signInError {
                error = signInError
                showError = true
            }
        case .failure(let signInError):
            error = signInError
            showError = true
        }
    }

    @MainActor
    private func handleGoogleSignIn() async {
        do {
            try await authService.signInWithGoogle()
            onSignedIn()
        } catch let signInError {
            error = signInError
            showError = true
        }
    }

    private func randomNonceString(length: Int = 32) -> String {
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        while remainingLength > 0 {
            let randoms: [UInt8] = (0..<16).map { _ in
                var random: UInt8 = 0
                _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                return random
            }
            for random in randoms {
                if remainingLength == 0 { break }
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
