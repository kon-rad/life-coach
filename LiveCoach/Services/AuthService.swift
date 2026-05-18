import SwiftUI
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import AuthenticationServices
import CryptoKit

@MainActor
@Observable final class AuthService: NSObject {
    var currentFirebaseUser: FirebaseAuth.User?
    var isLoading = false
    var error: Error?

    private var signInContinuation: CheckedContinuation<Void, Error>?
    private var currentNonce: String?

    enum AuthError: Error {
        case noRootViewController
        case missingToken
        case invalidCredential
    }

    override init() {
        super.init()
        guard FirebaseApp.app() != nil else { return }
        currentFirebaseUser = Auth.auth().currentUser
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in self?.currentFirebaseUser = user }
        }
    }

    func signInWithApple() async throws {
        isLoading = true
        defer { isLoading = false }
        let nonce = randomNonceString()
        currentNonce = nonce
        let hashedNonce = sha256(nonce)
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            signInContinuation = continuation
            controller.performRequests()
        }
    }

    func signInWithGoogle() async throws {
        isLoading = true
        defer { isLoading = false }
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = scene.keyWindow?.rootViewController else {
            throw AuthError.noRootViewController
        }
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
        guard let idToken = result.user.idToken?.tokenString else {
            throw AuthError.missingToken
        }
        let accessToken = result.user.accessToken.tokenString
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
        try await Auth.auth().signIn(with: credential)
        try? await ProxyAPIClient.shared.postEmpty("/auth/init")
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }

    func deleteAccount() async throws {
        try? await ProxyAPIClient.shared.delete("/user")
        try await Auth.auth().currentUser?.delete()
    }

    private func handleAppleAuthorization(_ authorization: ASAuthorization) async {
        guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = appleCredential.identityToken,
              let token = String(data: tokenData, encoding: .utf8),
              let nonce = currentNonce else {
            signInContinuation?.resume(throwing: AuthError.invalidCredential)
            signInContinuation = nil
            return
        }
        let credential = OAuthProvider.appleCredential(
            withIDToken: token,
            rawNonce: nonce,
            fullName: appleCredential.fullName
        )
        do {
            try await Auth.auth().signIn(with: credential)
            try? await ProxyAPIClient.shared.postEmpty("/auth/init")
            signInContinuation?.resume()
        } catch {
            signInContinuation?.resume(throwing: error)
        }
        signInContinuation = nil
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

extension AuthService: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        Task { @MainActor [weak self] in
            await self?.handleAppleAuthorization(authorization)
        }
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        Task { @MainActor [weak self] in
            self?.signInContinuation?.resume(throwing: error)
            self?.signInContinuation = nil
        }
    }
}

extension AuthService: ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .compactMap { $0.keyWindow }
                .first ?? UIWindow()
        }
    }
}
