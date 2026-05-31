import Foundation

@MainActor
@Observable final class RetrospectiveService {
    var retrospectives: [Retrospective] = []
    var isLoading = false
    var error: Error?
    private let api = ProxyAPIClient.shared

    func load() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do { retrospectives = try await api.get("/retrospectives") }
        catch { self.error = error }
    }
}
