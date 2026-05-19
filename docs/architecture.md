# Life Coach App — Technical Architecture

**Version:** 1.0  
**Date:** 2026-05-18  
**Platform:** iOS (Swift/SwiftUI), Firebase, Proxy Server

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         iOS App (Swift)                          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Home    │  │ Project  │  │  Calls   │  │  Profile     │   │
│  │  Tab     │  │  Tab     │  │  Tab     │  │  Tab         │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    App Services Layer                       │ │
│  │  AuthService │ ProjectService │ SessionService │ ChatService│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Network Layer                             │ │
│  │            ProxyAPIClient (all data reads/writes)          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (all requests)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Proxy Server (Node.js)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth Middleware│  │ Encryption   │  │ Key Store            │  │
│  │ (Firebase JWT)│  │ Service      │  │ (per-user AES keys)  │  │
│  └──────────────┘  │ (AES-256-GCM)│  └──────────────────────┘  │
│                    └──────────────┘                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ VAPI Webhook │  │ Together AI  │  │ RevenueCat Webhook   │  │
│  │ Handler      │  │ Proxy        │  │ Handler              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────┬────────────────┬───────────────────┬────────────────┘
            │                │                   │
     ┌──────▼──────┐  ┌──────▼──────┐   ┌───────▼──────┐
     │  Firebase   │  │ Together AI │   │   VAPI API   │
     │  Firestore  │  │ (Llama 3.3) │   │  (Voice)     │
     │  (encrypted │  └─────────────┘   └──────────────┘
     │   ciphertext│
     └─────────────┘
            │
     ┌──────▼──────┐
     │ Firebase    │
     │ Auth        │
     └─────────────┘

     ┌─────────────────────────┐
     │     RevenueCat SDK      │
     │  (in-app, direct)       │
     └─────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| iOS App | Swift 5.9+, SwiftUI | UI and app logic |
| State Management | `@Observable` + `@EnvironmentObject` | Reactive app state |
| Auth | Firebase Auth SDK | Identity management |
| Auth Providers | Sign in with Apple, Google Sign-In SDK | OAuth providers |
| Real-time data | Firebase Firestore SDK | Live micro-action sync |
| Backend API | Node.js (Express) + TypeScript | Proxy, encryption, webhooks |
| Encryption | AES-256-GCM | Data-at-rest encryption |
| Key storage | Proxy server secure store (e.g., HashiCorp Vault or encrypted Postgres) | Per-user encryption keys |
| Voice | VAPI SDK (iOS) | Structured voice calls |
| LLM (text) | Together AI REST API (Llama-3.3-70B-Instruct-Turbo) | Text chat |
| Subscriptions | RevenueCat SDK (iOS) + RevenueCat REST API | Paywalls, entitlements |
| Push notifications | Firebase Cloud Messaging (FCM) | Reminders, nudges |
| Analytics | Firebase Analytics (anonymized) | Usage metrics |

---

## 3. iOS App Architecture

### 3.1 Pattern

MVVM with a service layer. Views observe ViewModels via `@Observable`. ViewModels call Services. Services communicate with the Proxy API and Firebase SDK.

```
View → ViewModel → Service → ProxyAPIClient / FirebaseSDK
```

ViewModels are scoped to features; services are app-wide singletons injected via `@EnvironmentObject`.

### 3.2 Directory Structure

```
LiveCoach/
├── App/
│   ├── LiveCoachApp.swift           # App entry, DI root
│   ├── AppState.swift               # Global observable state
│   └── RootView.swift               # Tab bar or onboarding fork
│
├── Features/
│   ├── Onboarding/
│   │   ├── OnboardingCoordinator.swift
│   │   ├── WelcomeView.swift
│   │   ├── PrivacyView.swift
│   │   ├── SignInView.swift
│   │   ├── GoalInputView.swift
│   │   └── HowItWorksView.swift
│   │
│   ├── Home/
│   │   ├── HomeViewModel.swift
│   │   ├── HomeView.swift
│   │   ├── ScoreCardView.swift
│   │   ├── MicroActionRowView.swift
│   │   └── StatsGridView.swift
│   │
│   ├── Project/
│   │   ├── ProjectViewModel.swift
│   │   ├── ProjectView.swift
│   │   ├── DaySessionRowView.swift
│   │   └── EditProjectView.swift
│   │
│   ├── Calls/
│   │   ├── CallsViewModel.swift
│   │   ├── CallsListView.swift
│   │   ├── ConversationDetailView.swift
│   │   ├── VoiceCallView.swift
│   │   └── NewConversationSheet.swift
│   │
│   └── Profile/
│       ├── ProfileViewModel.swift
│       ├── ProfileView.swift
│       ├── SubscriptionView.swift
│       └── NotificationSettingsView.swift
│
├── Services/
│   ├── AuthService.swift            # Firebase auth + Apple/Google
│   ├── ProjectService.swift         # Project CRUD
│   ├── SessionService.swift         # Daily sessions + micro-actions
│   ├── ChatService.swift            # Text chat via Together AI proxy
│   ├── VoiceCallService.swift       # VAPI integration
│   ├── SubscriptionService.swift    # RevenueCat
│   └── NotificationService.swift   # FCM + local notifications
│
├── Network/
│   ├── ProxyAPIClient.swift         # All HTTP calls to proxy
│   ├── APIEndpoint.swift            # Route definitions
│   └── APIError.swift
│
├── Models/
│   ├── User.swift
│   ├── Project.swift
│   ├── DailySession.swift
│   ├── MicroAction.swift
│   ├── Conversation.swift
│   ├── Message.swift
│   └── Subscription.swift
│
└── Shared/
    ├── Extensions/
    ├── Components/           # Reusable UI components
    └── Constants.swift
```

### 3.3 State Management

`AppState` (global `@Observable`):
- `currentUser: User?`
- `currentProject: Project?`
- `todaySession: DailySession?`
- `subscriptionStatus: SubscriptionStatus`
- `isOnboardingComplete: Bool`

Each feature ViewModel is created by its View and holds only feature-scoped state.

---

## 4. Data Models

### 4.1 Swift Models

```swift
struct User: Codable, Identifiable {
    let id: String              // Firebase UID (opaque)
    var displayName: String
    var createdAt: Date
    var voiceMinutesUsedThisWeek: Int
    var weeklyVoiceQuotaSeconds: Int    // 3600 = 60 min
    var totalVoiceSecondsUsed: Int
    var totalChatMessages: Int
    var notificationSettings: NotificationSettings
}

struct Project: Codable, Identifiable {
    let id: String
    let userId: String
    var title: String
    var description: String     // AI-generated
    let createdAt: Date
    var isActive: Bool
}

struct DailySession: Codable, Identifiable {
    let id: String              // Format: "{userId}_{YYYY-MM-DD}"
    let userId: String
    let date: String            // "YYYY-MM-DD"
    var microActions: [MicroAction]
    var morningCallId: String?
    var eveningCallId: String?
    var score: Int?             // 0–10, set after evening call
    var scoreRationale: String?
    var tomorrowMicroActions: [MicroAction]?  // set by evening call
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
    var type: ConversationType  // .morningCall | .eveningCall | .freeChat | .freeVoice
    var messages: [Message]
    var vapiCallId: String?
    var durationSeconds: Int?
    var createdAt: Date
    var summary: String?        // AI-generated 1-line summary
}

enum ConversationType: String, Codable {
    case morningCall, eveningCall, freeChat, freeVoice
}

struct Message: Codable, Identifiable {
    let id: String
    var role: MessageRole       // .user | .assistant
    var content: String
    let timestamp: Date
}

enum MessageRole: String, Codable {
    case user, assistant
}
```

### 4.2 Firebase Firestore Schema

All `*` fields are stored as encrypted ciphertext (base64-encoded AES-256-GCM output). Non-encrypted fields are marked `[plain]`.

```
/users/{uid}/
  - displayName*: String (encrypted)
  - createdAt: Timestamp [plain]
  - voiceMinutesUsedThisWeek: Int [plain]
  - weeklyQuotaResetAt: Timestamp [plain]
  - totalVoiceSecondsUsed: Int [plain]
  - totalChatMessages: Int [plain]
  - notificationSettings*: Map (encrypted)

/projects/{projectId}/
  - userId: String [plain] — for security rules
  - title*: String (encrypted)
  - description*: String (encrypted)
  - createdAt: Timestamp [plain]
  - isActive: Bool [plain]

/sessions/{sessionId}/    — sessionId = "{uid}_{YYYY-MM-DD}"
  - userId: String [plain]
  - date: String [plain]    — "YYYY-MM-DD", for queries
  - microActions*: Array (encrypted JSON)
  - tomorrowMicroActions*: Array (encrypted JSON)
  - morningCallId: String [plain]
  - eveningCallId: String [plain]
  - score: Int [plain]      — intentionally not encrypted (aggregate metric)
  - scoreRationale*: String (encrypted)

/conversations/{conversationId}/
  - userId: String [plain]
  - type: String [plain]
  - vapiCallId: String [plain]
  - durationSeconds: Int [plain]
  - createdAt: Timestamp [plain]
  - summary*: String (encrypted)
  - messages*: Array (encrypted JSON)
```

**Firebase Security Rules:**
- All reads and writes require authenticated Firebase user
- Users can only access documents where `userId == request.auth.uid`
- The proxy server authenticates as a service account with write access
- Client SDK is read-only for real-time micro-action completion (Firestore listeners)

**Exception:** Micro-action completion (checkbox toggle) is written directly from the iOS app to Firestore (not through the proxy) since it involves only a `[plain]` field change embedded in the encrypted array — see Section 5.3 for how this is handled.

---

## 5. Proxy Server Architecture

### 5.1 Overview

The proxy is a Node.js/Express server deployed on a cloud provider (e.g., Railway, Fly.io, or AWS). It is the only component that:
- Holds per-user encryption keys
- Reads/writes plaintext data
- Forwards requests to Together AI and VAPI

The iOS app presents its Firebase JWT on every request. The proxy verifies the JWT against Firebase Auth before processing any request.

### 5.2 Endpoints

```
POST /auth/init
  — Called once at account creation
  — Generates a per-user AES-256-GCM key, stores it in key store
  — Response: { success: true }

GET  /project
     POST /project
     PUT  /project/:id
  — Read/write user's project (decrypt/encrypt transparently)

GET  /sessions?from=YYYY-MM-DD&to=YYYY-MM-DD
     GET  /sessions/:date
     PUT  /sessions/:date/microactions/:actionId/complete
  — Session reads, micro-action completion

POST /chat
  — Proxy to Together AI
  — Decrypts conversation history, calls Together AI, re-encrypts response
  — Request: { conversationId, newMessage }
  — Streams response back (SSE)

POST /conversations
     GET  /conversations
     GET  /conversations/:id
  — Create and retrieve conversation records

POST /vapi/init-call
  — Generates a VAPI call token with encrypted context injected into system prompt
  — Returns VAPI call credentials to iOS

POST /webhooks/vapi
  — Receives VAPI call end webhook
  — Parses structured JSON payload (micro-actions, score)
  — Encrypts and writes to Firestore

POST /webhooks/revenuecat
  — Updates user subscription entitlement in Firestore

GET  /user/profile
     PUT  /user/profile
  — User profile read/write

DELETE /user
  — Deletes all user data from Firestore and removes encryption key
```

### 5.3 Encryption Service

```typescript
// Encryption is AES-256-GCM with a per-user key.
// Each encrypted value is: base64(iv [12 bytes] + ciphertext + authTag [16 bytes])

class EncryptionService {
  encrypt(plaintext: string, userId: string): Promise<string>
  decrypt(ciphertext: string, userId: string): Promise<string>
  encryptObject(obj: object, userId: string): Promise<string>
  decryptObject(ciphertext: string, userId: string): Promise<object>
  generateKey(userId: string): Promise<void>   // called at account creation
  deleteKey(userId: string): Promise<void>     // called at account deletion
}
```

All plaintext leaves the proxy only in the direction of Together AI / VAPI API requests. It never persists in the proxy itself.

### 5.4 Key Store

- Keys stored in a Postgres table: `(userId TEXT PRIMARY KEY, encryptedKey BYTEA, createdAt TIMESTAMP)`
- The table-level key (master key) is stored as an environment variable on the proxy host (never in the database)
- Per-user key: `AES-256-GCM encrypt(userKey, masterKey)`
- On key fetch: `AES-256-GCM decrypt(storedKey, masterKey)` → user key in memory for the duration of the request only

### 5.5 VAPI System Prompt Injection

When initializing a VAPI call, the proxy:
1. Decrypts the user's project description
2. Decrypts the last 7 days of session data
3. Constructs a system prompt string (plaintext, never stored)
4. Passes it to VAPI's call creation API as the assistant's `systemPrompt` override
5. The plaintext system prompt exists only in transit; VAPI uses it for the call duration

---

## 6. Integration Specifications

### 6.1 VAPI Integration

**iOS SDK usage:**
```swift
// VoiceCallService.swift
class VoiceCallService: ObservableObject {
    @Published var callState: CallState = .idle
    @Published var transcript: [Message] = []
    
    func startCall(type: ConversationType) async throws
    func endCall() async
}
```

**Call initialization flow:**
1. iOS calls `POST /vapi/init-call` with `{ callType: "morning" | "evening" | "free" }`
2. Proxy decrypts context, builds system prompt, calls VAPI API to get call token
3. iOS receives call token + call ID
4. iOS VAPI SDK starts call with the token
5. VAPI streams audio; transcript arrives via VAPI SDK delegate callbacks
6. Call ends → VAPI fires webhook to `POST /webhooks/vapi`

**VAPI Webhook Payload (end of morning call):**
```json
{
  "event": "call.ended",
  "callId": "vapi_call_id",
  "userId": "firebase_uid",
  "callType": "morning",
  "transcript": "...",
  "structuredOutput": {
    "microActions": [
      { "id": "uuid", "title": "Send 3 cold emails to potential clients" },
      { "id": "uuid", "title": "Spend 30 minutes updating portfolio" },
      { "id": "uuid", "title": "Post one piece of content on LinkedIn" }
    ]
  },
  "durationSeconds": 312
}
```

**VAPI Webhook Payload (end of evening call):**
```json
{
  "event": "call.ended",
  "callId": "vapi_call_id",
  "userId": "firebase_uid",
  "callType": "evening",
  "transcript": "...",
  "structuredOutput": {
    "completedActionIds": ["uuid1", "uuid3"],
    "score": 7,
    "scoreRationale": "Great effort today — completed 2 of 3 actions and showed strong reflection.",
    "tomorrowMicroActions": [
      { "id": "uuid", "title": "Follow up with 2 contacts from yesterday" },
      { "id": "uuid", "title": "Draft the pricing page for the website" },
      { "id": "uuid", "title": "15-minute morning workout" }
    ]
  },
  "durationSeconds": 287
}
```

**VAPI structured output** is configured via VAPI's function calling / JSON output feature in the assistant configuration.

### 6.2 Together AI Integration

**Text chat via proxy (streaming):**
```
POST /chat
Authorization: Bearer <firebase-jwt>
Content-Type: application/json

{
  "conversationId": "uuid",
  "message": "I'm struggling to stay motivated this week..."
}

Response: text/event-stream (SSE)
data: {"delta": "I hear you"}
data: {"delta": " — that kind of"}
...
data: {"done": true, "messageId": "uuid"}
```

**Proxy builds Together AI request:**
```typescript
const response = await togetherAI.chat.completions.create({
  model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  messages: [
    { role: "system", content: buildSystemPrompt(project, recentSessions) },
    ...decryptedHistory,
    { role: "user", content: newMessage }
  ],
  stream: true,
  max_tokens: 500,
  temperature: 0.7
});
```

**System prompt template:**
```
You are a warm, direct, and results-oriented life coach. You are working with an anonymous user.

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
- You do not know the user's name, email, or any identifying information
- Be direct and specific — generic advice is useless
```

### 6.3 RevenueCat Integration

**iOS:** Standard RevenueCat SDK integration
- `Purchases.configure(withAPIKey:)` at app launch
- `Purchases.shared.getCustomerInfo()` to check entitlements
- `Purchases.shared.purchase(package:)` for subscriptions and credit packs

**Entitlement IDs:**
- `"premium"` — active subscription (monthly or annual)
- `"voice_credits_30"` — 30-minute credit pack
- `"voice_credits_120"` — 120-minute credit pack

**RevenueCat webhook (proxy):**
- On `INITIAL_PURCHASE` / `RENEWAL`: update user's subscription status in Firestore
- On `EXPIRATION` / `CANCELLATION`: downgrade to free tier
- On credit pack purchase: add minutes to `voiceMinutesUsedThisWeek` offset

**SubscriptionService (iOS):**
```swift
class SubscriptionService: ObservableObject {
    @Published var customerInfo: CustomerInfo?
    @Published var isPremium: Bool = false
    @Published var voiceMinutesRemaining: Int = 0

    func fetchStatus() async
    func purchase(package: Package) async throws
    func restorePurchases() async throws
}
```

### 6.4 Firebase Auth

**Supported providers:**
- Sign in with Apple (required by App Store guidelines when Google is offered)
- Google Sign-In

**Auth flow:**
1. User completes OAuth flow via native SDK
2. Firebase creates/updates user record
3. App receives Firebase ID token
4. App calls `POST /auth/init` on proxy (proxy verifies token, creates encryption key if new user)
5. All subsequent proxy requests include the Firebase ID token as `Authorization: Bearer <token>`

**Token refresh:** Firebase SDK auto-refreshes tokens. ProxyAPIClient intercepts 401 responses and refreshes before retrying.

---

## 7. Streak & Score Computation

Streak and statistics are computed on the proxy (not on device) to ensure consistency.

**Streak computation:**
```typescript
function computeStreak(sessions: DailySession[]): number {
  const sorted = sessions.sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let expectedDate = today();
  for (const session of sorted) {
    if (session.date === expectedDate && session.microActions.some(a => a.isCompleted)) {
      streak++;
      expectedDate = previousDay(expectedDate);
    } else if (session.date === previousDay(expectedDate)) {
      // grace period: allow one-day gap if tomorrow is today
      break;
    } else {
      break;
    }
  }
  return streak;
}
```

**Average score:**
- Rolling 30-day average of `score` fields across sessions
- Computed on proxy and returned as part of `/user/profile` response

---

## 8. Push Notifications

**Provider:** Firebase Cloud Messaging (FCM)

**Flow:**
1. iOS requests notification permission at end of onboarding
2. iOS registers device token with FCM
3. Device token sent to proxy → stored (encrypted) in user profile
4. Proxy schedules notifications via server-side FCM API based on user's configured reminder times (stored in UTC)
5. Daily notifications are scheduled 7 days in advance and refreshed weekly

**Notification types:**

| Type | Trigger | Time |
|------|---------|------|
| Morning check-in | Daily, if morning call not yet done | User-configured (default 8 AM) |
| Evening check-in | Daily, if evening call not yet done | User-configured (default 9 PM) |
| Streak at risk | If no micro-actions completed by 7 PM | 7:00 PM local |
| Weekly summary | Every Sunday | 10:00 AM local |

---

## 9. Security Considerations

| Threat | Mitigation |
|--------|-----------|
| Firebase data breach | All PII is AES-256-GCM encrypted; ciphertext is useless without proxy key |
| Proxy compromise | Master key stored as env var, not in code or DB; keys rotated on breach |
| JWT forgery | Proxy verifies all JWTs against Firebase Auth public keys |
| Man-in-the-middle | All connections use TLS 1.3; certificate pinning on proxy domain |
| Unauthorized data access | Firestore security rules enforce `userId == auth.uid`; proxy re-validates |
| AI data leakage | Plaintext sent to AI only in request headers, never logged; no user ID sent |
| Account deletion | Deletes all Firestore documents AND removes encryption key; data is unrecoverable |

---

## 10. Scalability Notes

- Firestore scales horizontally; no action required for typical growth
- Proxy is stateless and can be horizontally scaled behind a load balancer
- Key store (Postgres) is the single stateful component — use managed Postgres (e.g., Supabase, RDS)
- Together AI and VAPI are third-party; rate limits apply (plan accordingly)
- VAPI webhook processing should be idempotent (VAPI may retry on failure)
- Voice minute accounting uses Firestore transactions to prevent race conditions

---

## 11. Development Environment

```
LiveCoach/              — iOS Xcode project
proxy-server/           — Node.js proxy (TypeScript)
  ├── src/
  │   ├── routes/
  │   ├── services/
  │   ├── middleware/
  │   └── index.ts
  ├── .env.example
  └── package.json
```

**Required environment variables (proxy):**
```
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=  # base64-encoded service account
MASTER_ENCRYPTION_KEY=          # 32-byte hex random key
TOGETHER_AI_API_KEY=
VAPI_API_KEY=
VAPI_ASSISTANT_ID=
REVENUECAT_WEBHOOK_SECRET=
DATABASE_URL=                   # Postgres connection string
PORT=3000
```

**iOS Config (via xcconfig / Info.plist):**
```
PROXY_BASE_URL = https://api.livecoach.app   # prod
PROXY_BASE_URL = http://localhost:3000        # dev
FIREBASE_PROJECT_ID = ...
REVENUECAT_API_KEY = ...
GOOGLE_CLIENT_ID = ...
VAPI_PUBLIC_KEY = ...
```

---

## 12. Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|------------|
| 1 | Auth, onboarding, project creation, proxy scaffolding, encryption | User can sign in, set a goal, data is encrypted in Firebase |
| 2 | Home tab, Project tab, micro-action UI, streak/stats | User sees their dashboard and can check off actions |
| 3 | Text chat (Together AI), Calls tab | User can have text conversations with AI coach |
| 4 | Voice calls (VAPI), webhook processing, morning/evening call flows | User can have structured voice check-ins |
| 5 | RevenueCat subscriptions, paywall, voice credits | Monetization working end-to-end |
| 6 | Push notifications, score system, daily quotes | Daily engagement loop complete |
| 7 | Onboarding polish, edge cases, TestFlight, App Store submission | Shipped |
