# Live Coach — Ralph Loop Task Spec

> **For the Ralph loop:** `ralph.sh` runs a fresh Claude on every iteration. Pick the first unchecked task in **§7 Task List**, implement it end-to-end, verify against its **Acceptance** block, commit, append the task ID + VERIFY line to `progress.txt`, then exit. Do **one task per iteration**. Tasks are ordered so dependencies resolve naturally — do not skip ahead.

Full product spec: `docs/PRD.md`  
Full architecture spec: `docs/architecture.md`

---

## 1. Goal

An iOS AI life coaching app where the user focuses on one personal or professional project and stays accountable through daily morning and evening voice check-ins with an AI coach (via VAPI), generating 3 micro-actions per day and a daily 0–10 score. Text chat with the coach is also available (via Together AI). All user data is end-to-end encrypted via a proxy server before storage in Firebase Firestore.

---

## 2. Non-Goals (v1.0)

- Multiple simultaneous projects (one project only, by design)
- Android or web
- Social/community features
- Human coach escalation
- Calendar integrations
- Audio recording storage (transcripts only)

---

## 3. Locked Tech Stack

| Concern | Choice |
|---------|--------|
| Language | Swift 5.9+, SwiftUI |
| iOS deployment | iOS 17.0+ |
| Auth | Firebase Auth (Apple + Google Sign-In) |
| Database | Firebase Firestore (ciphertext only) |
| Push notifications | Firebase Cloud Messaging |
| Encryption proxy | Node.js/Express/TypeScript |
| Key store | Postgres (proxy-side, master key in env var) |
| Encryption | AES-256-GCM, per-user keys |
| LLM (text chat) | Together AI `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Voice calls | VAPI (vapi.ai) REST API — no Swift SDK dependency, use URLSession + WebRTC via VapiSDK package if available, otherwise implement via VAPI's Web SDK bridge or native REST/WebSocket |
| Subscriptions | RevenueCat SDK |
| Project generation | XcodeGen (`xcodegen generate` from `project.yml`) |
| Xcode scheme | `LiveCoach` |
| iOS Simulator | `iPhone 16` |
| Team ID | `DHB5JNF8ZW` |
| Bundle ID | `com.konradgnat.livecoach` |

---

## 4. Architecture Summary

### 4.1 iOS App Structure

```
LiveCoach/                     ← app target source root
├── App/
│   ├── LiveCoachApp.swift     ← @main, DI root, Firebase.configure()
│   ├── AppState.swift         ← @Observable global state
│   └── RootView.swift         ← tabs vs onboarding fork
├── Features/
│   ├── Onboarding/            ← 5-screen flow
│   ├── Home/                  ← Home tab (dashboard)
│   ├── Project/               ← Project tab
│   ├── Calls/                 ← Calls tab (chat + voice)
│   └── Profile/               ← Profile tab
├── Services/                  ← app-wide singletons
├── Network/                   ← ProxyAPIClient + APIEndpoint
├── Models/                    ← Swift structs/enums
├── Shared/                    ← extensions, components, constants
├── Assets.xcassets
├── Info.plist
└── GoogleService-Info.plist   ← placeholder (real file added manually)
LiveCoachTests/
proxy/                         ← Node.js proxy server
```

### 4.2 Data Models (Swift structs, Codable)

```swift
struct User: Codable, Identifiable {
    let id: String               // Firebase UID
    var displayName: String
    var createdAt: Date
    var voiceMinutesUsedThisWeek: Int    // seconds
    var weeklyVoiceQuotaSeconds: Int     // 3600 = 60 min
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var notificationSettings: NotificationSettings
}

struct NotificationSettings: Codable {
    var morningReminderHour: Int   // 0-23, default 8
    var morningReminderMinute: Int // default 0
    var eveningReminderHour: Int   // default 21
    var eveningReminderMinute: Int // default 0
    var streakReminders: Bool      // default true
}

struct Project: Codable, Identifiable {
    let id: String
    let userId: String
    var title: String
    var description: String   // AI-generated expansion
    let createdAt: Date
    var isActive: Bool
}

struct DailySession: Codable, Identifiable {
    let id: String           // "{userId}_{YYYY-MM-DD}"
    let userId: String
    let date: String         // "YYYY-MM-DD"
    var microActions: [MicroAction]
    var morningCallId: String?
    var eveningCallId: String?
    var score: Int?          // 0-10
    var scoreRationale: String?
    var tomorrowMicroActions: [MicroAction]?
}

struct MicroAction: Codable, Identifiable {
    let id: String
    var title: String
    var isCompleted: Bool
    var completedAt: Date?
}

struct Conversation: Codable, Identifiable {
    let id: String
    let userId: String
    var type: ConversationType
    var messages: [Message]
    var vapiCallId: String?
    var durationSeconds: Int?
    let createdAt: Date
    var summary: String?
}

enum ConversationType: String, Codable {
    case morningCall, eveningCall, freeChat, freeVoice
}

struct Message: Codable, Identifiable {
    let id: String
    var role: MessageRole
    var content: String
    let timestamp: Date
}

enum MessageRole: String, Codable {
    case user, assistant
}

struct UserStats: Codable {
    var currentStreak: Int
    var totalDaysComplete: Int   // days with all 3 actions done
    var totalMicroActionsDone: Int
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var averageScore: Double?    // nil if no evening calls yet
    var voiceMinutesRemainingThisWeek: Int
}
```

### 4.3 ProxyAPIClient

All data reads/writes go through the proxy. Every request includes `Authorization: Bearer <firebase-id-token>`. The proxy verifies the token against Firebase Auth, looks up the user's encryption key, and encrypts/decrypts data transparently.

```swift
// Network/ProxyAPIClient.swift
final class ProxyAPIClient {
    static let shared = ProxyAPIClient()
    private let baseURL = Constants.proxyBaseURL  // from Info.plist or Constants

    func get<T: Decodable>(_ path: String) async throws -> T
    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T
    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T
    func delete(_ path: String) async throws
    func stream(_ path: String, body: some Encodable) -> AsyncThrowingStream<String, Error>
    
    private func authToken() async throws -> String  // fetches fresh Firebase ID token
    private func request(_ path: String, method: String, body: Data?) async throws -> Data
}
```

### 4.4 Proxy API Endpoints

```
POST   /auth/init                           — generate per-user encryption key (called once at signup)
GET    /project                             — get user's active project
POST   /project                             — create project (body: {title, description?})
PUT    /project/:id                         — update project title (triggers AI description regen)

GET    /sessions?from=YYYY-MM-DD&to=YYYY-MM-DD  — list sessions
GET    /sessions/:date                      — get single day's session
PUT    /sessions/:date/microactions/:actionId/complete  — toggle micro-action completion
                                            body: {isCompleted: bool}

POST   /chat                               — stream Together AI response (SSE)
                                            body: {conversationId, message}
GET    /conversations                      — list all conversations
POST   /conversations                      — create conversation record
GET    /conversations/:id                  — get conversation with messages

POST   /vapi/init-call                     — get VAPI call token with context injected
                                            body: {callType: "morning"|"evening"|"free"}
                                            response: {vapiCallToken, callId}

POST   /webhooks/vapi                      — VAPI call-end webhook (signed)
POST   /webhooks/revenuecat               — RevenueCat event webhook

GET    /user/profile                       — get user profile
PUT    /user/profile                       — update profile fields
GET    /user/stats                         — streak, avg score, totals
DELETE /user                               — delete all data + encryption key
```

### 4.5 VAPI Webhook Payloads

Morning call (type: morningCall):
```json
{
  "event": "call.ended",
  "callId": "string",
  "userId": "firebase_uid",
  "callType": "morning",
  "transcript": "string",
  "structuredOutput": {
    "microActions": [
      {"id": "uuid", "title": "string"},
      {"id": "uuid", "title": "string"},
      {"id": "uuid", "title": "string"}
    ]
  },
  "durationSeconds": 312
}
```

Evening call (type: eveningCall):
```json
{
  "event": "call.ended",
  "callId": "string",
  "userId": "firebase_uid",
  "callType": "evening",
  "transcript": "string",
  "structuredOutput": {
    "completedActionIds": ["uuid1"],
    "score": 7,
    "scoreRationale": "string",
    "tomorrowMicroActions": [
      {"id": "uuid", "title": "string"},
      {"id": "uuid", "title": "string"},
      {"id": "uuid", "title": "string"}
    ]
  },
  "durationSeconds": 287
}
```

### 4.6 Together AI System Prompt Template

```
You are a warm, direct, and results-oriented life coach. You are working with an anonymous user (you do not know their name, email, or any identifying information).

Their current project: {projectTitle}
Project description: {projectDescription}

Recent progress (last 7 days):
{formattedSessionHistory}

Today's micro-actions:
{formattedMicroActions}

Rules:
- Keep responses under 150 words unless the user asks for detail
- Ask one question at a time
- Do not use filler phrases like "Absolutely!" or "Great question!"
- Be direct and specific — generic advice is useless
- You are a coach, not a therapist; focus on action and accountability
```

---

## 5. UI Summary

**Bottom tab bar:** Home | Project | Calls | Profile

**Home:** greeting, score card (today's score or 30-day average), encouraging daily quote, project reminder pill, today's 3 micro-action checkboxes, morning/evening check-in CTA button, 2×3 stats grid (streak, days complete, total actions, voice minutes, chat messages, avg score).

**Project:** project title + AI description + edit link, reverse-chronological list of days grouped with date header, day score badge, 3 micro-action checkboxes per day (today's are interactive, past are read-only).

**Calls:** segmented filter (All/Voice/Chat), list of conversations (icon, date, type label, duration/count, 1-line summary), "+" button to start new conversation. New conversation sheet: "Voice call" vs "Text chat". Conversation detail: chat bubbles (user right, assistant left), text input at bottom (if text), score badge at bottom for evening calls.

**Profile:** avatar + display name + member since, subscription section (plan, voice minutes remaining, upgrade/manage button, buy credits), notification settings (morning/evening time pickers, streak toggle), privacy/data (export, delete account), sign out.

**Onboarding (5 screens):**
1. Welcome — value prop + "Get Started"
2. Privacy — encryption explanation
3. Sign In — Apple button (primary) + Google button
4. Goal Input — text field + mic button (speech-to-text), example chips
5. How It Works — 3-step explanation + RevenueCat paywall card

---

## 6. Proxy Server Structure

```
proxy/
├── src/
│   ├── index.ts             ← Express app + route mounting
│   ├── middleware/
│   │   └── auth.ts          ← Firebase JWT verification
│   ├── routes/
│   │   ├── project.ts
│   │   ├── sessions.ts
│   │   ├── chat.ts
│   │   ├── conversations.ts
│   │   ├── vapi.ts
│   │   ├── webhooks.ts
│   │   └── user.ts
│   └── services/
│       ├── encryption.ts    ← AES-256-GCM encrypt/decrypt
│       ├── keyStore.ts      ← Postgres per-user key CRUD
│       ├── firebase.ts      ← Firestore admin + Auth admin
│       ├── togetherAI.ts   ← Together AI streaming client
│       └── vapi.ts          ← VAPI REST client
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 7. Task List

> The Ralph loop picks the first `- [ ]` task, implements it, verifies, commits, logs to progress.txt, and exits.
> **Build commands:** iOS tasks → `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep -E "(SUCCEEDED|FAILED|error:)"` and test with the same replacing `build` with `test`. Proxy tasks → `cd proxy && npx tsc --noEmit && npm test`.
> **Never modify** ralph.sh, project.yml, or docs/* (except adding GoogleService-Info.plist placeholder). **Never git add** design/, docs/PRD.md, docs/architecture.md, .env, *.log, DerivedData/, build/, or any binary/media.

---

### Phase 0 — Scaffold

- [x] **T-001 — Xcode project + directory structure**
  - **Why**: Need the Xcode project and source directories before any Swift code can compile.
  - **Do**: Run `xcodegen generate` from the repo root to create `LiveCoach.xcodeproj` from `project.yml`. Then create the following empty directories and placeholder files:
    - `LiveCoach/App/` — create `LiveCoachApp.swift` with a minimal `@main struct LiveCoachApp: App { var body: some Scene { WindowGroup { Text("Loading") } } }` and `import SwiftUI`
    - `LiveCoach/Features/Onboarding/` — empty
    - `LiveCoach/Features/Home/` — empty
    - `LiveCoach/Features/Project/` — empty
    - `LiveCoach/Features/Calls/` — empty
    - `LiveCoach/Features/Profile/` — empty
    - `LiveCoach/Services/` — empty
    - `LiveCoach/Network/` — empty
    - `LiveCoach/Models/` — empty
    - `LiveCoach/Shared/` — empty
    - `LiveCoach/Assets.xcassets/` — create with `Contents.json` (`{"info":{"author":"xcode","version":1}}`) and `AppIcon.appiconset/Contents.json` (`{"images":[],"info":{"author":"xcode","version":1}}`) and `AccentColor.colorset/Contents.json` (`{"colors":[{"idiom":"universal"}],"info":{"author":"xcode","version":1}}`)
    - `LiveCoach/Info.plist` — minimal with `CFBundleName`, `CFBundleIdentifier`, `CFBundleVersion 1`, `CFBundleShortVersionString 1.0`, `UILaunchScreen {}`, `UISupportedInterfaceOrientations ["UIInterfaceOrientationPortrait"]`, `UIApplicationSceneManifest` with `UIApplicationSupportsMultipleScenes false`
    - `LiveCoach/GoogleService-Info.plist` — placeholder: `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>BUNDLE_ID</key><string>com.konradgnat.livecoach</string><key>PROJECT_ID</key><string>REPLACE_ME</string><key>GOOGLE_APP_ID</key><string>REPLACE_ME</string><key>API_KEY</key><string>REPLACE_ME</string><key>IS_ADS_ENABLED</key><false/><key>IS_ANALYTICS_ENABLED</key><false/><key>IS_APPINVITE_ENABLED</key><false/><key>IS_GCM_ENABLED</key><false/><key>IS_SIGNIN_ENABLED</key><true/><key>STORAGE_BUCKET</key><string>REPLACE_ME</string></dict></plist>`
    - `LiveCoachTests/LiveCoachTests.swift` — import XCTest; class LiveCoachTests: XCTestCase { func testPlaceholder() { XCTAssertTrue(true) } }
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"` exits 0. `xcodebuild test -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(TEST SUCCEEDED|passed)"` exits 0.
  - **Depends on**: —

- [x] **T-002 — Core data models**
  - **Why**: All other Swift files import these types. Define them once here.
  - **Do**: Create the following files in `LiveCoach/Models/`. Each file is one struct/enum. Use `import Foundation` only. All types must be `Codable`, `Identifiable` where appropriate, `Sendable`. Use a `CodingKeys` enum only when the JSON key differs from the Swift property name. Do NOT import Firebase, SwiftUI, or anything else.
    - `User.swift` — `User` struct + `NotificationSettings` struct (per §4.2)
    - `Project.swift` — `Project` struct (per §4.2)
    - `DailySession.swift` — `DailySession` struct + `MicroAction` struct (per §4.2)
    - `Conversation.swift` — `Conversation` struct + `ConversationType` enum + `Message` struct + `MessageRole` enum (per §4.2)
    - `UserStats.swift` — `UserStats` struct (per §4.2)
  - **Acceptance**: All model files compile as part of `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build`. Create `LiveCoachTests/ModelTests.swift` with unit tests: (1) round-trip JSON encode/decode a `MicroAction` (2) round-trip a `DailySession` with two `MicroAction` items (3) `ConversationType.morningCall` raw value equals `"morningCall"` (4) `MessageRole.user` raw value equals `"user"`. All 4 tests pass.
  - **Depends on**: T-001

- [x] **T-003 — Constants + Info.plist privacy strings**
  - **Why**: Privacy strings are required by App Store / iOS for mic and speech. Constants centralizes config.
  - **Do**:
    - Add to `LiveCoach/Info.plist`: `NSMicrophoneUsageDescription` = `"Live Coach uses the microphone for voice check-ins with your AI coach."`, `NSSpeechRecognitionUsageDescription` = `"Live Coach transcribes your spoken goal during onboarding."`, `NSUserNotificationUsageDescription` = `"Live Coach sends daily coaching reminders."`, `UIBackgroundModes` array containing `"remote-notification"`, `CFBundleURLTypes` array with one item: `{"CFBundleURLSchemes":["com.googleusercontent.apps.REPLACE_ME"]}` (placeholder for Google Sign-In reverse client ID).
    - Create `LiveCoach/Shared/Constants.swift`:
      ```swift
      import Foundation
      enum Constants {
          static let proxyBaseURL = ProcessInfo.processInfo.environment["PROXY_BASE_URL"] ?? "http://localhost:3000"
          static let revenueCatAPIKey = ProcessInfo.processInfo.environment["REVENUECAT_API_KEY"] ?? "REPLACE_ME"
          static let vapiPublicKey = ProcessInfo.processInfo.environment["VAPI_PUBLIC_KEY"] ?? "REPLACE_ME"
          static let weeklyVoiceQuotaSeconds = 3600  // 60 min
          static let freeTierDailyMessageLimit = 10
          enum Entitlements {
              static let premium = "premium"
          }
          enum DailyQuotes {
              static let all: [String] = [
                  "Small daily improvements are the key to staggering long-term results.",
                  "You don't rise to the level of your goals. You fall to the level of your systems.",
                  "The secret of getting ahead is getting started.",
                  "Action is the foundational key to all success.",
                  "Progress, not perfection.",
                  "Every expert was once a beginner.",
                  "Discipline is the bridge between goals and accomplishment.",
                  "Your future self is watching you right now.",
                  "Do something today that your future self will thank you for.",
                  "The only way to do great work is to love what you do.",
                  "Start where you are. Use what you have. Do what you can.",
                  "Success is the sum of small efforts, repeated day in and day out.",
                  "The harder you work for something, the greater you'll feel when you achieve it.",
                  "Don't watch the clock. Do what it does. Keep going.",
                  "You are braver than you believe, stronger than you seem.",
                  "Push yourself, because no one else is going to do it for you.",
                  "Great things never come from comfort zones.",
                  "Dream it. Wish it. Do it.",
                  "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
                  "One day or day one. You decide."
              ]
              static func quote(for date: Date = Date()) -> String {
                  let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
                  return all[(dayOfYear - 1) % all.count]
              }
          }
      }
      ```
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Add test in `LiveCoachTests/ModelTests.swift`: `Constants.DailyQuotes.all.count == 20` passes. `plutil -lint LiveCoach/Info.plist` exits 0.
  - **Depends on**: T-001

- [x] **T-004 — AppState + RootView + app entry point**
  - **Why**: Provides the global state container and root routing (onboarding vs. main tab bar).
  - **Do**: Create the following files:
    - `LiveCoach/App/AppState.swift`:
      ```swift
      import SwiftUI
      @Observable final class AppState {
          var currentUser: User?
          var currentProject: Project?
          var todaySession: DailySession?
          var userStats: UserStats?
          var isOnboardingComplete: Bool = false
          var isPremium: Bool = false
          var isLoading: Bool = false
          var errorMessage: String?
      }
      ```
    - `LiveCoach/App/RootView.swift`: A SwiftUI `View` that reads `appState.isOnboardingComplete` and either shows `OnboardingCoordinatorView()` (placeholder `Text("Onboarding")`) or `MainTabView()` (placeholder `Text("Main App")`). Both placeholders will be replaced in later tasks.
    - Update `LiveCoach/App/LiveCoachApp.swift`: Add `@State private var appState = AppState()`. Inject `appState` into the environment via `.environment(appState)`. Show `RootView()` in the `WindowGroup`. Call `FirebaseApp.configure()` in `init()` (import FirebaseCore). Call `Purchases.configure(withAPIKey: Constants.revenueCatAPIKey)` in `init()` (import RevenueCat).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Write unit test `LiveCoachTests/AppStateTests.swift`: create `AppState()`, assert `isOnboardingComplete == false`, set `isPremium = true`, assert `isPremium == true`. Test passes.
  - **Depends on**: T-002, T-003

- [x] **T-005 — ProxyAPIClient**
  - **Why**: All data I/O (except auth) flows through this. Other services depend on it.
  - **Do**: Create `LiveCoach/Network/ProxyAPIClient.swift` and `LiveCoach/Network/APIError.swift`:

    `APIError.swift`:
    ```swift
    import Foundation
    enum APIError: Error, LocalizedError {
        case invalidURL
        case httpError(Int, String)
        case decodingError(Error)
        case unauthorized
        case noAuthToken
        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid URL"
            case .httpError(let code, let msg): return "HTTP \(code): \(msg)"
            case .decodingError(let e): return "Decode error: \(e.localizedDescription)"
            case .unauthorized: return "Unauthorized"
            case .noAuthToken: return "No auth token available"
            }
        }
    }
    ```

    `ProxyAPIClient.swift`:
    ```swift
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
    ```
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Write `LiveCoachTests/ProxyAPIClientTests.swift`: test that `APIError.httpError(404, "Not Found").errorDescription` contains "404". Test passes. Do NOT make real network calls in tests.
  - **Depends on**: T-003, T-004

---

### Phase 1 — Authentication

- [x] **T-006 — AuthService**
  - **Why**: Sign-in / sign-out before any data can be loaded.
  - **Do**: Create `LiveCoach/Services/AuthService.swift`:
    ```swift
    import SwiftUI
    import FirebaseAuth
    import GoogleSignIn
    import AuthenticationServices
    
    @MainActor
    @Observable final class AuthService: NSObject {
        var currentFirebaseUser: FirebaseAuth.User?
        var isLoading = false
        var error: Error?
    
        override init() {
            super.init()
            currentFirebaseUser = Auth.auth().currentUser
            Auth.auth().addStateDidChangeListener { [weak self] _, user in
                Task { @MainActor in self?.currentFirebaseUser = user }
            }
        }
    
        // Apple Sign-In
        func signInWithApple() async throws
        // Google Sign-In (requires UIViewController via UIApplication.shared.connectedScenes)
        func signInWithGoogle() async throws
        func signOut() throws
        func deleteAccount() async throws
    }
    ```
    Implement `signInWithApple()` using `ASAuthorizationAppleIDProvider` + `ASAuthorizationController` (wrap in `withCheckedThrowingContinuation`). Nonce must be SHA256-hashed per Firebase docs. Implement `signInWithGoogle()` using `GIDSignIn.sharedInstance.signIn(withPresenting:)` passing the root `UIViewController` obtained from `UIApplication.shared.connectedScenes`. `signOut()` calls `try Auth.auth().signOut()`. `deleteAccount()` reauthenticates then calls `try await Auth.auth().currentUser?.delete()`.
    
    After successful sign-in in both methods, check if this is a new user by calling `POST /auth/init` on `ProxyAPIClient.shared` (no body, ignore response body). Handle the case where the user already exists gracefully (proxy returns 200 or 409).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Write `LiveCoachTests/AuthServiceTests.swift`: test that `AuthService()` initializes without crash and `currentFirebaseUser` is nil when no user is signed in. Test passes.
  - **Depends on**: T-005

- [x] **T-007 — SignInView**
  - **Why**: The sign-in screen (onboarding screen 3).
  - **Do**: Create `LiveCoach/Features/Onboarding/SignInView.swift`. The view takes `onSignedIn: () -> Void` closure called after successful sign-in. Layout (centered VStack, padding 32): app logo placeholder (Image(systemName: "person.circle.fill") at 80pt, primary color), "Create your account" title, "Join thousands building better habits" subtitle, `SignInWithAppleButton` (primary, height 56), Google sign-in button (plain button styled with Google colors, height 56, shows Google "G" logo via Image(systemName: "globe") placeholder), "By continuing you agree to our Terms and Privacy Policy." fine print in gray. On success call `onSignedIn()`. On error show alert.

    Create `LiveCoach/Features/Onboarding/OnboardingCoordinatorView.swift` as a placeholder that simply shows `SignInView(onSignedIn: {})` for now. This file will be expanded in T-010.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-006

---

### Phase 2 — Onboarding

- [x] **T-008 — WelcomeView + PrivacyView**
  - **Why**: Onboarding screens 1 and 2.
  - **Do**: 
    Create `LiveCoach/Features/Onboarding/WelcomeView.swift`. Full-screen VStack: gradient background (from Color(.systemIndigo) to Color(.systemPurple)), white "Live Coach" title (largeTitle, bold), "Your AI life coach. Private by design." subtitle, three feature rows (Image(systemName: ...) icon + text):
    - mic.fill — "Daily 5-minute voice check-ins with your AI coach"
    - checkmark.circle.fill — "Three micro-actions every day that move you forward"  
    - lock.shield.fill — "Your data is encrypted. We cannot read it."
    Bottom: "Get Started" button (white, rounded, full-width) calls `onNext()` closure.

    Create `LiveCoach/Features/Onboarding/PrivacyView.swift`. White background. "Your conversations are yours alone." headline (title2, bold). Body text: "Live Coach uses end-to-end encryption. Your conversations, goals, and progress are encrypted with a key only you control. We store ciphertext — not your words." Three bullet rows:
    - checkmark.shield — "Anonymous to AI — the AI never sees your name or email"
    - lock.fill — "Encrypted at rest — your Firebase data is unreadable without your key"  
    - hand.raised.slash — "No selling, no training — your data is never used to train AI models"
    Bottom: "Continue" primary button calls `onNext()`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-007

- [x] **T-009 — GoalInputView**
  - **Why**: Onboarding screen 4 — captures the user's one project goal.
  - **Do**: Create `LiveCoach/Features/Onboarding/GoalInputView.swift`. Takes `onGoalSubmitted: (String) -> Void` closure.
    Layout: "What do you want to work on?" headline, "This is your one project. You can update it anytime." subtitle, multi-line TextEditor with placeholder text (overlay-based) for the goal text (max 200 chars), character count label, microphone button that uses `SFSpeechRecognizer` + `AVAudioEngine` to transcribe speech and append to the text field (request permission if needed; show mic disabled state if denied), scrollable row of tappable example chips: ["Start a business", "Get fit", "Learn a skill", "Find a relationship", "Get a new job"] — tapping a chip fills the text field with that chip text, "This is my goal →" button (disabled if text is empty) calls `onGoalSubmitted(text.trimmingCharacters(in: .whitespacesAndNewlines))`.
    Import `Speech` framework and `AVFoundation`. Handle `SFSpeechRecognizer.requestAuthorization` and `AVAudioSession` setup.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-008

- [x] **T-010 — HowItWorksView + OnboardingCoordinator wiring**
  - **Why**: Onboarding screen 5 + ties all 5 screens together.
  - **Do**: 
    Create `LiveCoach/Features/Onboarding/HowItWorksView.swift`. Takes `onComplete: () -> Void`. Layout: "Here's your daily routine" headline. Three numbered step cards (rounded rect background): "1 Morning check-in (5 min) — plan your day and get your 3 micro-actions", "2 Complete your micro-actions — small steps that add up", "3 Evening check-in (5 min) — reflect, score, and set up tomorrow". Below that: subscription card (rounded rect, light gray bg): "Live Coach Premium" title, "$19.99/month or $149.99/year", bullet list: "Unlimited chat · 60 voice minutes/week · Daily accountability". Two buttons: "Start Premium ($19.99/mo)" (primary, calls RevenueCat paywall stub — just `onComplete()` for now) and "Try free" (secondary, calls `onComplete()`). Note: RevenueCat paywall is wired in T-025.

    Replace `OnboardingCoordinatorView.swift` entirely: use `@State var step: Int = 0` and `@State var goalText: String = ""`. Switch on `step`:
    - 0 → `WelcomeView(onNext: { step = 1 })`
    - 1 → `PrivacyView(onNext: { step = 2 })`
    - 2 → `SignInView(onSignedIn: { step = 3 })`
    - 3 → `GoalInputView(onGoalSubmitted: { goal in goalText = goal; step = 4 })`
    - 4 → `HowItWorksView(onComplete: { Task { await completeOnboarding() } })`
    
    `completeOnboarding()` is a private async function that: (1) calls `POST /project` on ProxyAPIClient with `{title: goalText, description: ""}` to create the project, (2) saves `isOnboardingComplete = true` to `UserDefaults.standard`, (3) updates `appState.isOnboardingComplete = true`.
    
    Update `RootView.swift`: on appear, read `UserDefaults.standard.bool(forKey: "isOnboardingComplete")` and set `appState.isOnboardingComplete`. Also replace the placeholder `Text("Main App")` with `MainTabView()` — which for now is just a placeholder `TabView {}` (will be filled in T-013 and later).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-009

---

### Phase 3 — Home Tab

- [x] **T-011 — SessionService + HomeViewModel**
  - **Why**: Loads today's session, micro-actions, and stats from the proxy.
  - **Do**:
    Create `LiveCoach/Services/SessionService.swift`:
    ```swift
    @MainActor
    @Observable final class SessionService {
        var todaySession: DailySession?
        var isLoading = false
        var error: Error?
        private let api = ProxyAPIClient.shared

        func loadToday() async { ... }   // GET /sessions/:date (today's YYYY-MM-DD)
        func loadHistory(from: Date, to: Date) async throws -> [DailySession]  // GET /sessions?from=&to=
        func toggleMicroAction(sessionDate: String, actionId: String, isCompleted: Bool) async throws
            // PUT /sessions/:date/microactions/:id/complete body: {isCompleted}
            // Then update todaySession.microActions in memory
    }
    ```
    
    Create `LiveCoach/Features/Home/HomeViewModel.swift`:
    ```swift
    @MainActor
    @Observable final class HomeViewModel {
        var todaySession: DailySession?
        var userStats: UserStats?
        var dailyQuote: String = ""
        var isLoading = false
        var error: Error?
        
        private let sessionService: SessionService
        private let api = ProxyAPIClient.shared
        
        init(sessionService: SessionService) { self.sessionService = sessionService }
        
        func load() async {
            // Load today's session via sessionService
            // Load user stats via GET /user/stats
            // Set dailyQuote = Constants.DailyQuotes.quote(for: Date())
        }
        
        func toggleMicroAction(_ action: MicroAction, isCompleted: Bool) async {
            // call sessionService.toggleMicroAction(...)
            // update local todaySession
        }
        
        var isMorningCallDone: Bool { todaySession?.morningCallId != nil }
        var isEveningCallDone: Bool { todaySession?.eveningCallId != nil }
        var shouldShowMorningCTA: Bool { !isMorningCallDone && Calendar.current.component(.hour, from: Date()) < 14 }
        var shouldShowEveningCTA: Bool { !isEveningCallDone && Calendar.current.component(.hour, from: Date()) >= 14 }
        var displayScore: Double? { userStats?.averageScore }
        var todayScore: Int? { todaySession?.score }
    }
    ```
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Write `LiveCoachTests/HomeViewModelTests.swift`: create a `HomeViewModel` with a fresh `SessionService`. Assert `dailyQuote` is empty before `load()`. Assert `shouldShowMorningCTA` and `shouldShowEveningCTA` return Bool without crashing. Tests pass.
  - **Depends on**: T-005, T-004

- [x] **T-012 — HomeView**
  - **Why**: The main dashboard the user sees every day.
  - **Do**: Create `LiveCoach/Features/Home/HomeView.swift`. Uses `HomeViewModel` (create via `@State`). On appear calls `await viewModel.load()`.

    Layout (ScrollView, VStack spacing 16, padding 16):
    
    **Header**: greeting text — "Good morning" or "Good evening" based on hour, `.title2.bold()`.
    
    **Score card** (RoundedRectangle, filled, primary color): Large number (`todayScore ?? displayScore?.rounded()` formatted as "%.1f") or "—" if nil, label "Today's Score" or "Avg Score", subtitle with count of check-ins if avg. Color: green if ≥ 7, orange if 4–6, red if < 4, gray if nil.
    
    **Daily quote card** (RoundedRectangle, light background): Italic quote text from `viewModel.dailyQuote`. "Daily reminder" caption below.
    
    **Project reminder** (if `appState.currentProject != nil`): Horizontal pill with 🎯 + project title in one line. Gray background.
    
    **Micro-actions section**: "Today's Actions" header. If `todaySession?.microActions` is empty and morning call not done: "Complete your morning check-in to get today's actions" in gray italic. Else: `ForEach` over micro-actions showing `MicroActionRowView(action:, onToggle:)`.
    
    **Check-in CTA button**: Full-width button. If `shouldShowMorningCTA`: "Start morning check-in →". If `shouldShowEveningCTA`: "Start evening check-in →". If both done: "Great work today! 🎉" (disabled, green). Tapping navigates to VoiceCallView (placeholder navigation for now — a sheet with `Text("Voice call coming soon")`).
    
    **Stats grid**: `StatsGridView(stats: viewModel.userStats)`.
    
    Create `LiveCoach/Features/Home/MicroActionRowView.swift`: HStack with `Button { onToggle(!action.isCompleted) } label: { Image(systemName: action.isCompleted ? "checkmark.circle.fill" : "circle") }` (primary color when done, gray when not), `Text(action.title)` with strikethrough if completed. Optimistic UI: update local state immediately, revert on error.
    
    Create `LiveCoach/Features/Home/StatsGridView.swift`: A 2-column LazyVGrid. Each cell: icon + number + label. Cells: streak (flame.fill), days complete (checkmark.seal.fill), total actions (list.bullet.circle.fill), voice minutes (mic.fill, show as `totalVoiceSecondsUsed/60`), chat messages (bubble.left.fill), avg score (star.fill). Shows "—" for nil stats.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-011

- [x] **T-013 — MainTabView + tab bar wiring**
  - **Why**: Connects all four tabs into the main app navigation.
  - **Do**: Create `LiveCoach/App/MainTabView.swift`:
    ```swift
    import SwiftUI
    struct MainTabView: View {
        @Environment(AppState.self) var appState
        @State private var sessionService = SessionService()
        var body: some View {
            TabView {
                HomeView()
                    .tabItem { Label("Home", systemImage: "house.fill") }
                ProjectView()
                    .tabItem { Label("Project", systemImage: "target") }
                CallsView()
                    .tabItem { Label("Calls", systemImage: "mic.fill") }
                ProfileView()
                    .tabItem { Label("Profile", systemImage: "person.fill") }
            }
            .environment(sessionService)
        }
    }
    ```
    Create stub views (each in their own file, just `Text("Coming soon")` with a `.navigationTitle`):
    - `LiveCoach/Features/Project/ProjectView.swift` — stub
    - `LiveCoach/Features/Calls/CallsView.swift` — stub  
    - `LiveCoach/Features/Profile/ProfileView.swift` — stub

    Update `RootView.swift` to use `MainTabView()` instead of `Text("Main App")`. The `HomeView` from T-012 needs a `SessionService` injected — inject it via `.environment(sessionService)` in `MainTabView`.

    Also, on `MainTabView` `.task {}`: load `appState.currentProject` by calling `GET /project` if `currentUser != nil`. Load `appState.currentUser` by calling `GET /user/profile`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-012

---

### Phase 4 — Project Tab

- [x] **T-014 — ProjectService + ProjectViewModel + ProjectView**
  - **Why**: Displays the user's one active project and the history of daily micro-actions.
  - **Do**:
    Create `LiveCoach/Services/ProjectService.swift`:
    ```swift
    @MainActor @Observable final class ProjectService {
        var activeProject: Project?
        private let api = ProxyAPIClient.shared
        func load() async throws  // GET /project → set activeProject
        func create(title: String) async throws -> Project  // POST /project {title, description:""}
        func update(id: String, title: String) async throws -> Project  // PUT /project/:id {title}
    }
    ```

    Create `LiveCoach/Features/Project/ProjectViewModel.swift`:
    ```swift
    @MainActor @Observable final class ProjectViewModel {
        var project: Project?
        var sessions: [DailySession] = []
        var isLoading = false
        var error: Error?
        private let api = ProxyAPIClient.shared
        private let projectService: ProjectService
        init(projectService: ProjectService) { ... }
        func load() async  // load project + last 30 days of sessions
        func toggleMicroAction(sessionDate: String, actionId: String, isCompleted: Bool) async
    }
    ```

    Replace stub `ProjectView.swift` with real implementation:
    - NavigationStack
    - **Header card** (RoundedRectangle): project title (title2, bold), project description (body, secondary), "Edit project" Button (sheet → `EditProjectView`)
    - **Micro-actions history** (List or ScrollView + LazyVStack): `ForEach(sessions)` grouped by date. Each group: date header (DateFormatter: "EEEE, MMMM d"), score badge if `session.score != nil` (colored number in circle), 3 `MicroActionRowView` items — interactive today, strikethrough + disabled past.
    - On appear: `await viewModel.load()`
    - Show `ProgressView` while loading, error banner if error.

    Create `LiveCoach/Features/Project/EditProjectView.swift`: a Sheet with a title text field (label: "My goal"), character limit 100, multiline description preview label (readonly, shown as "AI description preview — saved after update"), "Update Goal" button that calls `projectService.update(id:, title:)` then dismisses.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-013, T-011

---

### Phase 5 — Calls Tab: Text Chat

- [x] **T-015 — ChatService (Together AI via proxy)**
  - **Why**: Text chat with AI coach.
  - **Do**: Create `LiveCoach/Services/ChatService.swift`:
    ```swift
    @MainActor @Observable final class ChatService {
        var conversations: [Conversation] = []
        var isLoading = false
        private let api = ProxyAPIClient.shared

        func loadConversations() async throws  // GET /conversations
        func createConversation(type: ConversationType) async throws -> Conversation
            // POST /conversations {type: "freeChat"}
        func getConversation(id: String) async throws -> Conversation
            // GET /conversations/:id
        func sendMessage(conversationId: String, text: String) -> AsyncThrowingStream<String, Error>
            // POST /chat {conversationId, message: text} → SSE stream
            // Each yielded value is a JSON string: {"delta": "..."} or {"done": true, "messageId": "uuid"}
    }
    ```
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-005

- [x] **T-016 — CallsView + CallsListView**
  - **Why**: Shows all conversations and lets the user start a new one.
  - **Do**: Replace stub `CallsView.swift` with real implementation. Uses `ChatService` (inject via environment or `@State`). NavigationStack.

    **Header**: "Conversations" title (inline). "+" toolbar button → presents `NewConversationSheet`.
    
    **Filter**: Segmented `Picker` with "All", "Voice", "Chat" bound to `@State var filter: String = "All"`.
    
    **Conversation list**: `List(filteredConversations)` — each row:
    - Leading icon: `mic.circle.fill` (voice) or `bubble.left.fill` (chat), primary/indigo color
    - Title: `callTypeLabel(type)` — "Morning check-in", "Evening check-in", "Free chat", "Free voice call"
    - Subtitle: date (MMM d, h:mm a) + duration ("3 min" for voice) or message count ("12 messages" for chat)
    - Summary: `conversation.summary ?? ""` in secondary gray, lineLimit 1
    - Tap → navigate to `ConversationDetailView(conversation:)`
    
    Filter logic: "All" shows all, "Voice" filters `.morningCall`, `.eveningCall`, `.freeVoice`, "Chat" filters `.freeChat`.
    
    **`NewConversationSheet`**: sheet with "Start a conversation" title. Two large button cards: "Voice call" (mic.circle.fill, "Talk with your AI coach • uses voice minutes") and "Text chat" (bubble.left.fill, "Type with your AI coach • unlimited on premium"). Voice tapped → dismiss + navigate to `VoiceCallView` (placeholder for now). Text tapped → create `freeChat` conversation via `chatService.createConversation(type: .freeChat)` → navigate to `ConversationDetailView`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-015, T-013

- [x] **T-017 — ConversationDetailView (streaming chat UI)**
  - **Why**: The core chat interface with streaming AI responses.
  - **Do**: Create `LiveCoach/Features/Calls/ConversationDetailView.swift`. Takes a `Conversation` (or conversation ID string) and `ChatService`.

    Layout:
    - `NavigationStack` with title from `callTypeLabel(conversation.type)`
    - If `conversation.score != nil` (evening call): show score banner at top: "Day Score: \(score)/10" with color
    - `ScrollView` + `LazyVStack(alignment: .leading, spacing: 12)` for messages
      - User messages: `HStack { Spacer(); bubble }` — bubble: rounded rect, primary color, white text
      - Assistant messages: `HStack { bubble; Spacer() }` — bubble: rounded rect, light gray, primary text
      - While streaming: show a "typing" bubble with `ProgressView()`
    - `ScrollViewReader` to auto-scroll to bottom on new messages
    - Bottom input bar (only for text conversations — `type == .freeChat`): `HStack` with `TextField("Message your coach...", text: $input, axis: .vertical)` (lineLimit 1...5) + send `Button`. Send button calls `sendMessage()`.
    
    `sendMessage()` logic:
    1. Append user message to local `messages` array immediately (optimistic)
    2. Clear input field
    3. Append a placeholder assistant message with empty content
    4. Stream `chatService.sendMessage(conversationId:, text:)` — parse each delta JSON, append delta text to the last assistant message's content
    5. On stream complete: reload conversation from `chatService.getConversation(id:)` to get the saved `messageId`

    Voice call transcripts (non-freeChat): show all messages read-only, no input bar.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-016

---

### Phase 6 — Voice Calls (VAPI)

- [x] **T-018 — VoiceCallService (VAPI integration)**
  - **Why**: VAPI powers the structured morning/evening voice check-ins.
  - **Do**: Research the VAPI Swift SDK at https://github.com/VapiAI/vapi-swift. If it is a valid Swift Package Manager package (has Package.swift), add it to `project.yml` under packages (url: `https://github.com/VapiAI/vapi-swift`, from the latest tag) and run `xcodegen generate`. If the SDK is NOT available via SPM, implement VAPI calls via their REST API: `POST https://api.vapi.ai/call/web` with bearer auth header `Authorization: Bearer {VAPI_PUBLIC_KEY}` and JSON body `{assistantId: "...", customer: {number: ""}}` to start a call, and use `URLSession` WebSocket or the returned call link.

    Create `LiveCoach/Services/VoiceCallService.swift`:
    ```swift
    @MainActor @Observable final class VoiceCallService {
        var callState: VoiceCallState = .idle
        var transcript: [Message] = []
        var currentCallId: String?
        var error: Error?
        
        enum VoiceCallState { case idle, connecting, active, ending, ended }
        
        // Gets a call token from proxy (POST /vapi/init-call {callType})
        // Then starts the VAPI call using the SDK or REST
        func startCall(type: ConversationType) async throws
        func endCall() async
    }
    ```
    
    `startCall` flow:
    1. Call `POST /vapi/init-call` on proxy with `{callType: "morning" | "evening" | "free"}` → receives `{vapiCallToken, callId}`
    2. Set `currentCallId = callId` and `callState = .connecting`
    3. Start VAPI call using SDK or WebRTC approach with the token
    4. Set `callState = .active`
    
    `endCall`: end the VAPI call, set `callState = .ending`, then `.ended`. The webhook will fire from VAPI to the proxy separately.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. If VAPI SDK was added, verify it imports without error.
  - **Depends on**: T-005

- [x] **T-019 — VoiceCallView**
  - **Why**: In-call UI shown during morning/evening check-ins.
  - **Do**: Create `LiveCoach/Features/Calls/VoiceCallView.swift`. Takes `callType: ConversationType` and `voiceCallService: VoiceCallService`.

    Layout (full-screen, dark background):
    - **Header**: "Morning Check-in" or "Evening Check-in" or "Voice Chat" title, white text
    - **Waveform placeholder**: Large centered `Image(systemName: "waveform")` at 80pt, animated with pulsing `scaleEffect` when `callState == .active`
    - **Status label**: "Connecting..." / "Listening..." / "Call ended" based on `callState`
    - **Transcript scroll**: last 5 messages from `voiceCallService.transcript` shown as small bubbles
    - **End call button**: Red circle with `xmark`, `endCall()` on tap
    - On `.active` state: shows "Tap end when finished" hint text
    
    On `.ended` state: auto-dismiss after 1.5 seconds and show a toast "Check-in saved! Your micro-actions will appear shortly."
    
    On appear: call `await voiceCallService.startCall(type: callType)`.
    
    Update `HomeView.swift` check-in CTA button to present `VoiceCallView` as a full-screen cover (`.fullScreenCover`).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-018, T-012

- [x] **T-020 — Voice minutes quota + display**
  - **Why**: Users need to see their remaining voice minutes and be gated when they exceed their quota.
  - **Do**: 
    In `VoiceCallService`, before starting a call, check `appState.userStats?.voiceMinutesRemainingThisWeek ?? 0 > 0` OR `appState.isPremium`. If not premium and 0 minutes remaining, throw `VoiceCallError.quotaExceeded`. Define `enum VoiceCallError: Error { case quotaExceeded; case notAvailableOnFreeTier }`. Non-premium users on free tier throw `notAvailableOnFreeTier` always.

    In `VoiceCallView`, catch these errors and show an alert: for `quotaExceeded` → "You've used all your voice minutes this week. Buy more in Profile." with "Go to Profile" + "Cancel" buttons. For `notAvailableOnFreeTier` → "Voice calls require a Live Coach subscription." with "Upgrade" + "Cancel".

    In `ProfileView` (stub), add a voice minutes row: "🎙 [N] / 60 minutes used this week" using `appState.userStats?.totalVoiceSecondsUsed`.

    Create `LiveCoach/Shared/Components/VoiceMinutesBanner.swift`: a view showing "X voice minutes remaining this week" used in both ProfileView and CallsView when minutes are low (< 10 remaining).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-019

---

### Phase 7 — Profile Tab

- [x] **T-021 — SubscriptionService (RevenueCat)**
  - **Why**: Entitlement checks gate voice calls and unlimited chat.
  - **Do**: Create `LiveCoach/Services/SubscriptionService.swift`:
    ```swift
    import RevenueCat
    @MainActor @Observable final class SubscriptionService {
        var customerInfo: CustomerInfo?
        var isPremium: Bool = false
        var availablePackages: [Package] = []
        var isLoading = false
        var error: Error?
        
        func fetchStatus() async throws
            // Purchases.shared.customerInfo() → set customerInfo, isPremium = info.entitlements[Constants.Entitlements.premium]?.isActive == true
        func purchase(package: Package) async throws
            // Purchases.shared.purchase(package:) → refetch status
        func restorePurchases() async throws
            // Purchases.shared.restorePurchases() → refetch status
        func fetchOfferings() async throws
            // Purchases.shared.offerings() → extract packages from current offering
    }
    ```
    On `LiveCoachApp.init()`: configure RevenueCat with `Purchases.configure(withAPIKey: Constants.revenueCatAPIKey)` and set `Purchases.logLevel = .debug` in debug builds.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. Write test `LiveCoachTests/SubscriptionServiceTests.swift`: `SubscriptionService()` initializes without crash, `isPremium` is false by default. Test passes.
  - **Depends on**: T-004

- [x] **T-022 — ProfileView (full implementation)**
  - **Why**: Settings, subscription management, sign-out, account deletion.
  - **Do**: Replace stub `ProfileView.swift` with real implementation. Inject `AuthService`, `SubscriptionService` via environment or `@State`.

    **Profile header section**: `AsyncImage` or initials avatar (gray circle with first letter of `displayName`), display name (editable via sheet), "Member since [date]" caption.
    
    **Subscription section** (Group in Form or VStack cards):
    - Current plan: "Free" / "Monthly" / "Annual" badge
    - Voice minutes: `VoiceMinutesBanner` component
    - "Upgrade plan" Button (primary, if not premium) → presents RevenueCat paywall (use `RevenueCatUI.PaywallView()` if available, else present `SubscriptionPaywallView` sheet showing `availablePackages`)
    - "Manage subscription" (if premium) → open App Store subscription management URL
    - "Buy voice minutes" Button → sheet with credit packs (30 min $4.99, 120 min $14.99 — RevenueCat packages)
    - "Restore purchases" small button
    
    **Settings section**:
    - "Notification Settings" row → NavigationLink to `NotificationSettingsView`
    
    **Privacy & Data section**:
    - "Privacy Policy" → opens URL (placeholder `https://livecoach.app/privacy`)
    - "Export my data" Button → shows alert "Coming soon"
    - "Delete Account" Button (destructive red) → confirmation alert "This will permanently delete all your data including all conversations, projects, and progress. This cannot be undone." → second confirmation alert "Are you sure? Type DELETE to confirm" → calls `DELETE /user` on proxy then `authService.deleteAccount()` then sets `appState.isOnboardingComplete = false`
    
    **Sign Out** button (red, bottom): calls `try authService.signOut()`, clears `UserDefaults.standard`, sets `appState.isOnboardingComplete = false`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-021, T-020, T-013

- [x] **T-023 — NotificationService + NotificationSettingsView**
  - **Why**: Daily coaching reminders are key to retention.
  - **Do**: Create `LiveCoach/Services/NotificationService.swift`:
    ```swift
    import UserNotifications
    @MainActor final class NotificationService {
        static let shared = NotificationService()
        
        func requestPermission() async -> Bool
            // UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        
        func scheduleCheckInReminders(morningHour: Int, morningMinute: Int, eveningHour: Int, eveningMinute: Int) 
            // Cancel existing check-in notifications then schedule repeating daily UNCalendarNotificationTrigger
            // Morning: identifier "morning_checkin", title "Good morning! 🌅", body "Time for your morning check-in with your AI coach."
            // Evening: identifier "evening_checkin", title "Evening check-in time 🌙", body "Reflect on today and plan tomorrow with your AI coach."
        
        func scheduleStreakReminder(enabled: Bool)
            // identifier "streak_reminder", fires daily at 7:00 PM if enabled
            // title "Don't break your streak! 🔥", body "Complete at least one micro-action today to keep going."
        
        func cancelAll()
    }
    ```
    
    Create `LiveCoach/Features/Profile/NotificationSettingsView.swift`: Form with two DatePicker rows (displayedComponents: .hourAndMinute) for morning/evening reminders, Toggle for streak reminders. On change: call `NotificationService.shared.scheduleCheckInReminders(...)`. Save preferences to `UserDefaults` and to `PUT /user/profile` on proxy.
    
    Call `NotificationService.shared.requestPermission()` at the end of onboarding (in `completeOnboarding()` in `OnboardingCoordinatorView`) and schedule default reminders (8 AM / 9 PM).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-022

---

### Phase 8 — Proxy Server

- [x] **T-024 — Proxy server scaffold**
  - **Why**: Foundation before any proxy routes can be written.
  - **Do**: Create `proxy/` directory with:
    
    `proxy/package.json`:
    ```json
    {
      "name": "livecoach-proxy",
      "version": "1.0.0",
      "scripts": {
        "build": "tsc",
        "start": "node dist/index.js",
        "dev": "ts-node src/index.ts",
        "test": "jest --testPathPattern='src/__tests__'"
      },
      "dependencies": {
        "express": "^4.18.0",
        "firebase-admin": "^12.0.0",
        "pg": "^8.11.0",
        "cors": "^2.8.5",
        "dotenv": "^16.0.0"
      },
      "devDependencies": {
        "typescript": "^5.0.0",
        "@types/express": "^4.17.0",
        "@types/pg": "^8.11.0",
        "@types/cors": "^2.8.0",
        "@types/node": "^20.0.0",
        "ts-node": "^10.9.0",
        "jest": "^29.0.0",
        "ts-jest": "^29.0.0",
        "@types/jest": "^29.0.0"
      }
    }
    ```
    
    `proxy/tsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "target": "ES2020", "module": "commonjs", "lib": ["ES2020"],
        "outDir": "./dist", "rootDir": "./src",
        "strict": true, "esModuleInterop": true,
        "skipLibCheck": true, "forceConsistentCasingInFileNames": true
      },
      "include": ["src/**/*"], "exclude": ["node_modules", "dist"]
    }
    ```
    
    `proxy/.env.example`:
    ```
    PORT=3000
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_SERVICE_ACCOUNT_JSON=base64-encoded-service-account-json
    MASTER_ENCRYPTION_KEY=64-char-hex-random-key
    TOGETHER_AI_API_KEY=
    VAPI_API_KEY=
    VAPI_ASSISTANT_ID_MORNING=
    VAPI_ASSISTANT_ID_EVENING=
    VAPI_ASSISTANT_ID_FREE=
    VAPI_WEBHOOK_SECRET=
    REVENUECAT_WEBHOOK_SECRET=
    DATABASE_URL=postgresql://localhost:5432/livecoach
    ```
    
    `proxy/src/index.ts`: Express app with `cors()`, `express.json()`, and a health check `GET /health → {status: "ok"}`. Mount placeholder routers for `/auth`, `/project`, `/sessions`, `/chat`, `/conversations`, `/vapi`, `/webhooks`, `/user`. Start server on `process.env.PORT || 3000`.
    
    `proxy/src/__tests__/health.test.ts`: jest test that imports the express app (exported from index.ts) and uses `supertest` to GET `/health`, asserts 200 + `{status: "ok"}`. Add `supertest` and `@types/supertest` to devDependencies.
    
    Run `cd proxy && npm install` to generate `package-lock.json`.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes the health check test.
  - **Depends on**: T-001

- [x] **T-025 — Firebase Admin + JWT middleware + /auth/init**
  - **Why**: All proxy routes require verified Firebase JWT.
  - **Do**: 
    `proxy/src/services/firebase.ts`: Initialize `firebase-admin` from `FIREBASE_SERVICE_ACCOUNT_JSON` env var (base64 decode → parse JSON → `admin.initializeApp({credential: admin.credential.cert(parsed)})`). Export `adminAuth = admin.auth()`, `db = admin.firestore()`.
    
    `proxy/src/middleware/auth.ts`: Express middleware that reads `Authorization: Bearer <token>`, verifies via `adminAuth.verifyIdToken(token)`, attaches `req.uid = decodedToken.uid` to the request, calls `next()` on success, returns 401 on failure. Export typed `AuthedRequest` interface extending `express.Request` with `uid: string`.
    
    `proxy/src/routes/auth.ts`: `POST /auth/init` (auth middleware applied). Check if key already exists for `req.uid` (via keyStore service — stub call returning null for now). If not, generate key (stub — log "would generate key"). Return `{success: true}`.
    
    `proxy/src/__tests__/auth.test.ts`: Mock `firebase-admin` verify to return `{uid: "test123"}`. Test that a request with a valid mock token to `GET /health` (once auth middleware is applied there for test) sets `req.uid`. Test that missing token returns 401.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-024

- [x] **T-026 — Encryption service + Postgres key store**
  - **Why**: Core privacy feature — all user data encrypted before Firebase storage.
  - **Do**:
    `proxy/src/services/keyStore.ts`: 
    ```typescript
    import { Pool } from 'pg';
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // CREATE TABLE IF NOT EXISTS user_keys (
    //   user_id TEXT PRIMARY KEY,
    //   encrypted_key BYTEA NOT NULL,
    //   created_at TIMESTAMPTZ DEFAULT NOW()
    // );
    
    export async function initTable(): Promise<void>
    export async function generateAndStoreKey(userId: string): Promise<void>
      // Generate 32 random bytes (crypto.randomBytes(32))
      // Encrypt with master key (AES-256-GCM using MASTER_ENCRYPTION_KEY)
      // INSERT INTO user_keys (user_id, encrypted_key) VALUES ($1, $2) ON CONFLICT DO NOTHING
    export async function getUserKey(userId: string): Promise<Buffer | null>
      // SELECT encrypted_key FROM user_keys WHERE user_id = $1
      // Decrypt with master key → return plaintext user key buffer
    export async function deleteUserKey(userId: string): Promise<void>
    ```
    
    `proxy/src/services/encryption.ts`:
    ```typescript
    import * as crypto from 'crypto';
    
    // Each encrypted value format: base64(iv[12] + ciphertext + authTag[16])
    export async function encrypt(plaintext: string, userId: string): Promise<string>
    export async function decrypt(ciphertext: string, userId: string): Promise<string>
    export async function encryptJSON(obj: unknown, userId: string): Promise<string>
    export async function decryptJSON<T>(ciphertext: string, userId: string): Promise<T>
    ```
    Implement using `crypto.createCipheriv('aes-256-gcm', key, iv)` and `crypto.createDecipheriv`. The master key is `Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex')` (32 bytes = 64 hex chars). Use a fresh random 12-byte IV per encryption call. The authTag is obtained via `cipher.getAuthTag()` and appended before base64 encoding.
    
    Update `proxy/src/routes/auth.ts` POST `/auth/init`: use `generateAndStoreKey(req.uid)` (skips if key exists due to ON CONFLICT DO NOTHING).
    
    `proxy/src/__tests__/encryption.test.ts`: Unit test encrypt/decrypt round-trip for a string. Unit test encryptJSON/decryptJSON round-trip for an object. Test that encrypting the same plaintext twice produces different ciphertexts (random IV). Tests use a hardcoded 32-byte test key (set `MASTER_ENCRYPTION_KEY` env var in test setup). Do NOT connect to Postgres in tests — mock `getUserKey` to return the test key.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-025

- [x] **T-027 — /project routes**
  - **Why**: iOS app needs to create and retrieve the user's project.
  - **Do**: `proxy/src/routes/project.ts`. All routes require auth middleware. All data stored in Firestore collection `projects` with document ID = `{userId}_active`.
    
    `GET /project`: Fetch `projects/{userId}_active` from Firestore. Decrypt `title` and `description` fields. Return `{id, userId, title, description, createdAt, isActive}`.
    
    `POST /project` body `{title: string, description?: string}`: 
    1. Encrypt `title` and `description` (or empty string)
    2. Write to Firestore `projects/{userId}_active`: `{userId, title: encrypted, description: encrypted, createdAt: Timestamp.now(), isActive: true}`
    3. Start async Together AI call to generate a 2-3 sentence project description (call `generateProjectDescription(title)` → POST to Together AI with prompt "In 2-3 sentences, describe what it means to work on this goal and what success looks like: {title}"). Update the `description` field in Firestore once received.
    4. Return the created project (with empty description initially — the async generation updates it).
    
    `PUT /project/:id` body `{title: string}`: Decrypt old, encrypt new title, update Firestore, trigger async description regeneration.
    
    `proxy/src/__tests__/project.test.ts`: Mock Firestore and encryption. Test GET returns decrypted project. Test POST creates project with encrypted fields. Test that missing title returns 400.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-026

- [x] **T-028 — /sessions routes**
  - **Why**: Stores and retrieves daily micro-actions per day.
  - **Do**: `proxy/src/routes/sessions.ts`. All routes require auth middleware. Session documents in Firestore `sessions/{userId}_{YYYY-MM-DD}`.
    
    `GET /sessions?from=YYYY-MM-DD&to=YYYY-MM-DD`: Query Firestore `sessions` collection where `userId == req.uid` and `date >= from` and `date <= to`. For each document, decrypt `microActions`, `tomorrowMicroActions`, `scoreRationale`. Return array of session objects.
    
    `GET /sessions/:date`: Fetch `sessions/{req.uid}_{date}`. Decrypt `microActions`, `tomorrowMicroActions`, `scoreRationale`. Return session object. Return `{id, userId, date, microActions: [], morningCallId: null, eveningCallId: null, score: null, scoreRationale: null, tomorrowMicroActions: null}` if not found (empty day).
    
    `PUT /sessions/:date/microactions/:actionId/complete` body `{isCompleted: boolean}`:
    1. Fetch session document
    2. Decrypt `microActions`
    3. Find action by `id`, update `isCompleted` and `completedAt`
    4. Re-encrypt and write back to Firestore
    5. Return updated session
    
    `proxy/src/__tests__/sessions.test.ts`: Mock Firestore + encryption. Test GET returns decrypted session with correct structure. Test completion toggle updates the correct action. Test that an unknown date returns the empty session template.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-026

- [x] **T-029 — /chat route (Together AI streaming proxy)**
  - **Why**: Text chat streams AI responses through the proxy so the iOS app never touches Together AI directly.
  - **Do**: `proxy/src/services/togetherAI.ts`:
    ```typescript
    interface TogetherMessage { role: 'system' | 'user' | 'assistant'; content: string; }
    
    export async function streamChat(
      messages: TogetherMessage[],
      onDelta: (delta: string) => void
    ): Promise<string>  // returns full response text
    ```
    Use `fetch` (Node 18+ global) to POST `https://api.together.xyz/v1/chat/completions` with:
    - `Authorization: Bearer ${TOGETHER_AI_API_KEY}`
    - body: `{model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", messages, stream: true, max_tokens: 500, temperature: 0.7}`
    Parse the SSE response stream using `response.body` as async iterator. Each line starting with `data: ` contains JSON; extract `choices[0].delta.content` and call `onDelta(delta)`.
    
    `proxy/src/routes/chat.ts`. Auth middleware applied.
    
    `POST /chat` body `{conversationId: string, message: string}`:
    1. Fetch conversation from Firestore `conversations/{conversationId}`, verify `userId == req.uid`
    2. Decrypt messages array
    3. Decrypt project title+description from `projects/{userId}_active`
    4. Build system prompt using the Together AI template from §4.6
    5. Load last 7 days of sessions for context (call sessions route logic)
    6. Build messages array: system prompt + last 20 conversation messages + new user message
    7. Set `Content-Type: text/event-stream` on response, disable buffering
    8. Stream via `togetherAI.streamChat(messages, (delta) => res.write('data: {"delta":"${delta}"}\n\n'))`
    9. Save new user message + assistant response to conversation in Firestore (encrypted)
    10. Write `data: {"done":true,"messageId":"${newMsgId}"}\n\n`, then `res.end()`
    
    `proxy/src/__tests__/chat.test.ts`: Mock Together AI client. Test that POST /chat calls streamChat with correct message array. Test that system prompt includes project title. Test that messages are saved to Firestore.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-027, T-028

- [x] **T-030 — /conversations routes**
  - **Why**: iOS needs to list all past conversations and fetch individual ones.
  - **Do**: `proxy/src/routes/conversations.ts`. Auth middleware.
    
    `GET /conversations`: Query Firestore `conversations` where `userId == req.uid`, order by `createdAt desc`, limit 50. For each, decrypt `summary`, return without decrypting full messages array (use empty `messages: []`). Include `type`, `durationSeconds`, `createdAt`, `vapiCallId`.
    
    `POST /conversations` body `{type: ConversationType}`: Create new conversation document in Firestore `conversations/{uuid}`: `{userId: req.uid, type, messages: encrypt([]), createdAt: Timestamp.now(), summary: encrypt(""), vapiCallId: null, durationSeconds: null}`. Return created conversation.
    
    `GET /conversations/:id`: Fetch document, verify ownership, decrypt `messages` array and `summary`. Return full conversation.
    
    `proxy/src/__tests__/conversations.test.ts`: Mock Firestore + encryption. Test GET list returns summaries without messages. Test POST creates conversation with correct type. Test GET single returns decrypted messages.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-026

- [ ] **T-031 — /vapi routes (init-call + system prompt injection)**
  - **Why**: Each VAPI call needs context (project, recent sessions) injected into the assistant's system prompt.
  - **Do**: `proxy/src/services/vapi.ts`:
    ```typescript
    export async function createVapiCall(params: {
      assistantId: string;
      systemPromptOverride: string;
      userId: string;
    }): Promise<{vapiCallId: string; callToken: string}>
    ```
    POST to `https://api.vapi.ai/call` with `Authorization: Bearer ${VAPI_API_KEY}`. Body: `{assistantId, assistantOverrides: {model: {systemPrompt: params.systemPromptOverride}}}`. Return callId and any client-side token from the response.
    
    `proxy/src/routes/vapi.ts`. Auth middleware.
    
    `POST /vapi/init-call` body `{callType: "morning" | "evening" | "free"}`:
    1. Decrypt project from Firestore
    2. Load last 7 sessions, decrypt micro-actions
    3. Build system prompt:
       - For morning: "You are a warm, direct life coach. User's project: {title}. {description}. Last 7 days: {formattedHistory}. Your job: (1) briefly reflect on recent progress (2) ask how they are feeling (3) help them identify 3 specific micro-actions for today (4) confirm the actions. At the end of the call, output a JSON block: ```json\n{\"microActions\":[{\"id\":\"uuid\",\"title\":\"...\"},...]}```"
       - For evening: "...Your job: (1) ask how today went (2) go through each micro-action: {formattedTodayActions} (3) celebrate wins, acknowledge misses without judgment (4) help plan tomorrow (5) give a score 0-10. At the end output: ```json\n{\"completedActionIds\":[...],\"score\":N,\"scoreRationale\":\"...\",\"tomorrowMicroActions\":[...]}```"
       - For free: standard coaching system prompt (§4.6)
    4. Call `vapi.createVapiCall({assistantId: VAPI_ASSISTANT_ID_{callType.toUpperCase()}, systemPromptOverride, userId})`
    5. Create conversation record in Firestore (type: callType, vapiCallId)
    6. Return `{vapiCallToken: callToken, callId: conversationId, vapiCallId}`
    
    `proxy/src/__tests__/vapi.test.ts`: Mock VAPI API + Firestore. Test that morning call prompt includes project title and micro-action instruction. Test that evening call prompt includes today's micro-actions. Test that conversation record is created.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-030, T-028

- [ ] **T-032 — /webhooks routes (VAPI + RevenueCat)**
  - **Why**: VAPI fires webhooks with structured call results; RevenueCat fires subscription events.
  - **Do**: `proxy/src/routes/webhooks.ts`.
    
    `POST /webhooks/vapi` (no auth middleware — verified via `VAPI_WEBHOOK_SECRET` header `x-vapi-secret`):
    - Parse body per §4.5 VAPI webhook schemas
    - For `callType == "morning"`:
      1. Parse `structuredOutput.microActions` from the JSON block in transcript (or from webhook body if VAPI supports structured output natively)
      2. Create today's session document if it doesn't exist
      3. Encrypt micro-actions array, write to `sessions/{userId}_{today}`: `{microActions: encrypted, morningCallId: conversationId}`
      4. Update conversation transcript in Firestore (encrypted)
    - For `callType == "evening"`:
      1. Parse `completedActionIds`, `score`, `scoreRationale`, `tomorrowMicroActions`
      2. Update today's session: set completed action IDs, `score` (plain int), encrypt `scoreRationale`
      3. Write tomorrow's micro-actions to `sessions/{userId}_{tomorrow}`: `{tomorrowMicroActions: encrypted}`
      4. Update total voice seconds for user in Firestore
      5. Update conversation record: `durationSeconds`, encrypted transcript
    - Return `{received: true}`
    
    `POST /webhooks/revenuecat` (verified via header `Authorization: Bearer ${REVENUECAT_WEBHOOK_SECRET}`):
    - Parse RevenueCat webhook event body
    - On `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`: set `subscriptionStatus = "premium"` in `users/{userId}` Firestore doc
    - On `EXPIRATION`, `CANCELLATION`: set `subscriptionStatus = "free"`
    - Map RevenueCat `app_user_id` to Firebase UID (RevenueCat should be configured to use Firebase UID as app user ID — document this in .env.example)
    - Return `{received: true}`
    
    `proxy/src/__tests__/webhooks.test.ts`: Mock Firestore. Test morning webhook creates session with 3 micro-actions. Test evening webhook sets score and tomorrow's actions. Test invalid VAPI secret returns 401. Test RevenueCat INITIAL_PURCHASE sets premium status.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-031

- [ ] **T-033 — /user routes (profile + stats + delete)**
  - **Why**: Profile read/write and account deletion.
  - **Do**: `proxy/src/routes/user.ts`. Auth middleware.
    
    `GET /user/profile`: Fetch `users/{uid}` from Firestore. Decrypt `displayName` and `notificationSettings`. Return `User` shape.
    
    `PUT /user/profile` body `{displayName?: string, notificationSettings?: NotificationSettings}`: Partial update — encrypt provided fields, merge-update Firestore doc.
    
    `GET /user/stats`:
    1. Fetch last 30 sessions from Firestore for this user
    2. Compute streak: sort by date desc, count consecutive days with ≥1 completed action
    3. Compute `totalDaysComplete`: sessions where all 3 actions completed
    4. Sum `totalMicroActionsDone` across all sessions
    5. Fetch total voice seconds and total chat messages from `users/{uid}`
    6. Compute `averageScore` from sessions with a score
    7. Compute `voiceMinutesRemainingThisWeek` = `weeklyVoiceQuotaSeconds - voiceMinutesUsedThisWeek` (stored in `users/{uid}`)
    8. Return `UserStats` shape
    
    `DELETE /user`:
    1. Fetch all `sessions` documents for this user → delete each
    2. Fetch all `conversations` documents → delete each
    3. Delete `projects/{uid}_active`
    4. Delete `users/{uid}`
    5. Call `deleteUserKey(uid)` from keyStore
    6. Return `{deleted: true}`
    
    `proxy/src/__tests__/user.test.ts`: Mock Firestore + encryption + keyStore. Test stats returns correct streak for 3 consecutive days. Test streak breaks on a missed day. Test DELETE removes all documents and calls deleteUserKey.
  - **Acceptance**: `cd proxy && npx tsc --noEmit` exits 0. `cd proxy && npm test` passes.
  - **Depends on**: T-026

---

### Phase 9 — Polish & Integration

- [ ] **T-034 — Free tier rate limiting**
  - **Why**: Free users are limited to 10 chat messages per day.
  - **Do**:
    In `proxy/src/routes/chat.ts` POST `/chat`: Before streaming, check if user is on free tier:
    1. Check `users/{uid}.subscriptionStatus` — if not "premium", count messages sent today
    2. Query `conversations` for today's date and count total messages where `role == "user"` across all conversations
    3. If count >= `Constants.freeTierDailyMessageLimit` (10), return `HTTP 402 {error: "daily_limit_reached", message: "Free tier limit of 10 messages per day reached. Upgrade to Premium for unlimited chat."}`
    
    In `LiveCoach/Services/ChatService.swift` `sendMessage()`: handle `APIError.httpError(402, ...)` — parse the error body and throw a typed error `ChatError.dailyLimitReached`. In `ConversationDetailView`, catch this error and present an alert: "You've reached your free limit of 10 messages today. Upgrade to Live Coach Premium for unlimited chat." with "Upgrade" (→ subscription sheet) and "OK" buttons.
    
    In `LiveCoach/Shared/Constants.swift`, add `static let freeTierDailyMessageLimit = 10` (already added in T-003).
    
    Add `enum ChatError: Error { case dailyLimitReached; case streamFailed }` to `LiveCoach/Services/ChatService.swift`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. `cd proxy && npx tsc --noEmit && npm test` passes. Write proxy test: mock user with 10 existing messages today → POST /chat returns 402.
  - **Depends on**: T-017, T-029

- [ ] **T-035 — User stats loading + Home tab avg score display**
  - **Why**: The Home tab dashboard should show live stats from the proxy.
  - **Do**:
    In `HomeViewModel.load()`: call `GET /user/stats` via ProxyAPIClient → decode `UserStats` → store in `HomeViewModel.userStats` and also update `appState.userStats` and `appState.isPremium = userStats.voiceMinutesRemainingThisWeek > 0 || subscriptionService.isPremium`.
    
    In `StatsGridView`: wire all 6 stats cells to `UserStats` (already designed in T-012 but stub data — replace with real data):
    - streak: `userStats?.currentStreak ?? 0`
    - days complete: `userStats?.totalDaysComplete ?? 0`
    - total actions: `userStats?.totalMicroActionsDone ?? 0`  
    - voice minutes: `(userStats?.totalVoiceSecondsUsed ?? 0) / 60` displayed as minutes
    - chat messages: `userStats?.totalChatMessages ?? 0`
    - avg score: `userStats?.averageScore.map { String(format: "%.1f", $0) } ?? "—"`
    
    Score card on HomeView: if `todayScore != nil`, show today's score prominently. Else show `averageScore`. If nil, show "—" with "Complete your first check-in" subtitle.
    
    Add pull-to-refresh: `ScrollView` in HomeView gets `.refreshable { await viewModel.load() }`.
    
    In `MainTabView.task {}`: load user stats via `GET /user/stats` and store in `appState.userStats`. Also refresh `appState.isPremium` from `SubscriptionService`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-013, T-033

- [ ] **T-036 — Push notification FCM registration**
  - **Why**: FCM device token must be sent to proxy so server can schedule daily reminders.
  - **Do**:
    In `LiveCoachApp.swift`: Add `UNUserNotificationCenter.current().delegate = notificationDelegate` in `init()`. Create `LiveCoach/Services/FCMDelegate.swift` implementing `UNUserNotificationCenterDelegate` and `MessagingDelegate`. In `MessagingDelegate.messaging(_:didReceiveRegistrationToken:)`: call `PUT /user/profile` with `{fcmToken: fcmToken}` on ProxyAPIClient. Add `fcmToken` as a plaintext (not encrypted) field in the `users/{uid}` Firestore document.
    
    In `proxy/src/routes/user.ts` PUT `/user/profile`: handle `fcmToken` field — store as plaintext in Firestore (not encrypted, needed for server-side FCM sends).
    
    In `proxy/src/services/firebase.ts`: add `export const messaging = admin.messaging()`. Add helper:
    ```typescript
    export async function sendPushNotification(fcmToken: string, title: string, body: string): Promise<void>
    ```
    Using `messaging.send({token: fcmToken, notification: {title, body}})`.
    
    Create `proxy/src/services/scheduler.ts`: Export `scheduleUserNotifications(userId: string)` that sends FCM notifications. Use `setTimeout` or a simple in-memory scheduler for MVP (production would use a cron service). For MVP, when the proxy starts, schedule morning (8 AM) and evening (9 PM) check-in reminders for all users with FCM tokens (fetch from Firestore, filter by `subscriptionStatus` or all users). Use `node-cron` (`npm install node-cron @types/node-cron`) for scheduling.
    
    Register the scheduler in `proxy/src/index.ts` `app.listen` callback.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. `cd proxy && npx tsc --noEmit && npm test` passes.
  - **Depends on**: T-023, T-033

- [ ] **T-037 — RevenueCat paywall + purchase flow (full wiring)**
  - **Why**: Monetization must be end-to-end functional.
  - **Do**:
    In `SubscriptionService.fetchOfferings()`: call `Purchases.shared.offerings()` and extract `current.availablePackages`. In `ProfileView` "Upgrade plan" button: call `subscriptionService.fetchOfferings()` then present a `SubscriptionPaywallView` sheet.
    
    Create `LiveCoach/Features/Profile/SubscriptionPaywallView.swift`: Takes `packages: [Package]` and `subscriptionService: SubscriptionService`. Shows:
    - "Live Coach Premium" title
    - Feature list: "✓ Unlimited text chat", "✓ 60 voice minutes/week", "✓ Daily accountability", "✓ All your data encrypted"
    - Monthly package button (shows price from RevenueCat): "Monthly — $X.XX/month"
    - Annual package button: "Annual — $XX.XX/year (save X%)" — compute savings percentage
    - "Restore purchases" text button at bottom
    - Loading state during purchase
    - On success: dismiss + show "Welcome to Premium!" toast + `appState.isPremium = true`
    - On error: show alert with error message
    
    In `HowItWorksView` (T-010): replace stub `onComplete()` call with real paywall: "Start Premium" presents `SubscriptionPaywallView`, "Try free" just calls `onComplete()`.
    
    Configure RevenueCat: in `LiveCoachApp.init()` after `Purchases.configure(...)`, call `Purchases.shared.delegate = subscriptionDelegate` (create a `RevenueCatDelegate` class that updates `appState.isPremium` on `customerInfoDidChange`).
    
    Wire `isPremium` to gate voice calls: in `VoiceCallService.startCall()`, if `!appState.isPremium` throw `VoiceCallError.notAvailableOnFreeTier`.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`.
  - **Depends on**: T-021, T-020, T-010

- [ ] **T-038 — Project description auto-generation + onboarding project creation**
  - **Why**: After the user enters their goal, the AI generates a 2-3 sentence project description. This should also be persisted and shown in the Project tab.
  - **Do**:
    In `OnboardingCoordinatorView.completeOnboarding()`: after calling `POST /project`, poll `GET /project` once every 2 seconds up to 10 seconds to wait for the AI-generated description to appear (description is non-empty). After the poll or timeout, update `appState.currentProject` with the fetched project.
    
    In `ProjectView`: Show a `ProgressView` spinner in the description area if `project.description.isEmpty` (description is still being generated). Add a "Refresh" button that calls `projectService.load()` to pick up the generated description.
    
    In `proxy/src/routes/project.ts`: Implement the async Together AI description generation properly. After writing the project to Firestore, use `setImmediate` to generate the description without blocking the response:
    ```typescript
    setImmediate(async () => {
      const prompt = `In 2-3 sentences, describe what working on this goal means and what success looks like: "${title}". Be specific and motivating. Do not use generic language.`;
      const description = await togetherAI.complete(prompt);  // non-streaming
      const encryptedDesc = await encrypt(description, userId);
      await db.doc(`projects/${userId}_active`).update({description: encryptedDesc});
    });
    ```
    Add `togetherAI.complete(prompt: string): Promise<string>` to the Together AI service (non-streaming POST to completions).
    
    In `proxy/src/__tests__/project.test.ts`: Test that POST /project responds immediately before description is generated. Test that description generation is triggered (mock together AI and verify it was called).
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. `cd proxy && npx tsc --noEmit && npm test` passes.
  - **Depends on**: T-014, T-027

- [ ] **T-039 — Final wiring: AppState sync + error handling + loading states**
  - **Why**: Wire all the loose ends so data flows correctly end-to-end across all tabs.
  - **Do**:
    1. In `MainTabView.task {}`: Load and populate `appState.currentUser` from `GET /user/profile`, `appState.currentProject` from `GET /project`, `appState.userStats` from `GET /user/stats`, `appState.isPremium` from `subscriptionService.fetchStatus()`. Show a full-screen `ProgressView` while loading (loading gate in `RootView` or `MainTabView`).
    
    2. In `HomeView`: inject `appState.currentProject` for the project reminder pill. Pass real `appState.userStats` to `StatsGridView`.
    
    3. In `CallsView`: inject `appState.userStats?.voiceMinutesRemainingThisWeek` for the voice credits banner.
    
    4. In `ProfileView`: inject `appState.currentUser` for display name and member since date. Inject `appState.userStats` for voice minutes display.
    
    5. Create `LiveCoach/Shared/Components/ErrorBanner.swift`: a reusable view showing an error message with a dismiss "×" button. Used across HomeView, ProjectView, CallsView.
    
    6. Add global error handler: in `AppState`, add `func setError(_ error: Error?)`. In each ViewModel's catch blocks, call `appState.setError(error)`. In `RootView`, show `ErrorBanner` at the top if `appState.errorMessage != nil`.
    
    7. Ensure `AuthService` updates `appState.currentUser = nil` on sign-out and `appState.isOnboardingComplete = false`. Ensure `RootView` reacts to this and shows the onboarding flow.
    
    8. Add `@Environment(AppState.self)` to all ViewModels and Views that need it. Verify everything compiles.
  - **Acceptance**: `xcodebuild -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD SUCCEEDED"`. `xcodebuild test -scheme LiveCoach -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(TEST SUCCEEDED|passed)"`. All existing tests continue to pass.
  - **Depends on**: T-035, T-037, T-038
