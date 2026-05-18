import Foundation

@MainActor
@Observable final class ProjectService {
    var activeProject: Project?
    private let api = ProxyAPIClient.shared

    func load() async throws {
        activeProject = try await api.get("/project")
    }

    func create(title: String) async throws -> Project {
        struct Body: Encodable { let title: String; let description: String }
        return try await api.post("/project", body: Body(title: title, description: ""))
    }

    func update(id: String, title: String) async throws -> Project {
        struct Body: Encodable { let title: String }
        let updated: Project = try await api.put("/project/\(id)", body: Body(title: title))
        activeProject = updated
        return updated
    }
}
