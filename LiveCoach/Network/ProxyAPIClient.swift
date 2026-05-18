import Foundation
import FirebaseAuth

final class ProxyAPIClient: Sendable {
    static let shared = ProxyAPIClient()
    private let baseURL: String = Constants.proxyBaseURL
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private func authToken() async throws -> String {
        guard let user = Auth.auth().currentUser else { throw APIError.noAuthToken }
        return try await user.getIDToken()
    }

    private func request(_ path: String, method: String, body: Data? = nil) async throws -> Data {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(try await authToken())", forHTTPHeaderField: "Authorization")
        req.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let msg = String(data: data, encoding: .utf8) ?? "Unknown error"
            if http.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.httpError(http.statusCode, msg)
        }
        return data
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        let data = try await request(path, method: "GET")
        do { return try decoder.decode(T.self, from: data) }
        catch { throw APIError.decodingError(error) }
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try encoder.encode(body)
        let data = try await request(path, method: "POST", body: bodyData)
        do { return try decoder.decode(T.self, from: data) }
        catch { throw APIError.decodingError(error) }
    }

    func postEmpty(_ path: String) async throws {
        _ = try await request(path, method: "POST")
    }

    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try encoder.encode(body)
        let data = try await request(path, method: "PUT", body: bodyData)
        do { return try decoder.decode(T.self, from: data) }
        catch { throw APIError.decodingError(error) }
    }

    func delete(_ path: String) async throws {
        _ = try await request(path, method: "DELETE")
    }

    func stream(_ path: String, body: some Encodable) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    guard let url = URL(string: baseURL + path) else {
                        continuation.finish(throwing: APIError.invalidURL); return
                    }
                    var req = URLRequest(url: url)
                    req.httpMethod = "POST"
                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    req.setValue("Bearer \(try await authToken())", forHTTPHeaderField: "Authorization")
                    req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    req.httpBody = try encoder.encode(body)
                    let (bytes, _) = try await URLSession.shared.bytes(for: req)
                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            let payload = String(line.dropFirst(6))
                            if payload == "[DONE]" { break }
                            continuation.yield(payload)
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
