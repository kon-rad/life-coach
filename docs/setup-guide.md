# Live Coach — Third-Party Services Setup Guide

Everything you need to configure before the app can run end-to-end. Work through sections in order — Firebase must be done first because other services depend on it.

---

## Status Snapshot

| Service | Code | Config |
|---|---|---|
| Firebase (Firestore + Auth) | ✅ | ✅ Bundle ID `com.konradgnat.lifecoachai` matches plist |
| Apple Sign-In | ✅ | ⚠️ Capability needs enabling |
| Google Sign-In | ✅ | ❌ Missing CLIENT_ID in GoogleService-Info.plist |
| Push Notifications (FCM) | ✅ | ❌ APNs key not uploaded to Firebase |
| RevenueCat | ✅ | ❌ API key is REPLACE_ME |
| VAPI | ✅ | ❌ VAPI_API_KEY / VAPI_ASSISTANT_ID not in proxy .env |

---

## 1. Firebase

### 1a. Bundle ID

The app's bundle ID is `com.konradgnat.lifecoachai` (set in `ios-app/project.yml` and
`ios-app/LiveCoach/Info.plist`). The bundled `GoogleService-Info.plist` must match it.

**In Firebase Console → Project Settings → Your Apps:**
1. Confirm an iOS app registered with bundle ID `com.konradgnat.lifecoachai` exists
   (if not, **Add app → iOS+** with that bundle ID).
2. Download its `GoogleService-Info.plist`.
3. Ensure `ios-app/LiveCoach/GoogleService-Info.plist` is that file.

### 1b. Enable Authentication providers

**Firebase Console → Authentication → Sign-in method:**
- Enable **Email/Password** (needed internally even if users only see Apple/Google)
- Enable **Apple** — no extra config needed here, Apple requires server-side setup (see §2)
- Enable **Google** — Firebase will auto-fill the Web client ID

### 1c. Create Firestore database

**Firebase Console → Firestore Database → Create database:**
1. Choose region (us-central1 is fine)
2. Start in **production mode** (locked rules)
3. Set security rules (users can only read their own data):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Note: The proxy server bypasses these rules using the Admin SDK. The rules above are a safety net for direct client access (which shouldn't happen in production since all writes go through the proxy).

### 1d. Generate a service account key for the proxy

**Firebase Console → Project Settings → Service accounts:**
1. Click **Generate new private key**
2. Save the JSON file (e.g., `service-account.json`)
3. Base64-encode it: `base64 -i service-account.json | tr -d '\n'`
4. Paste into proxy `.env`:
   ```
   FIREBASE_PROJECT_ID=lifecoach-dea8c
   FIREBASE_SERVICE_ACCOUNT_JSON=<the base64 string>
   ```

---

## 2. Apple Sign-In

The Swift code is complete. You need to enable the capability in Xcode and Apple Developer.

### 2a. Xcode capability

1. Open `ios-app/LiveCoach.xcodeproj` in Xcode
2. Select the **LiveCoach** target → **Signing & Capabilities**
3. Click **+** → search for **Sign in with Apple** → add it
4. This creates a `.entitlements` file automatically

### 2b. Apple Developer Portal

**developer.apple.com → Certificates, Identifiers & Profiles → Identifiers:**
1. Find `com.konradgnat.lifecoachai`
2. Check that **Sign in with Apple** is ticked
3. Click **Save**

No server-side configuration is needed for Apple Sign-In — Firebase handles the JWT validation.

---

## 3. Google Sign-In

### 3a. Get the REVERSED_CLIENT_ID

After downloading the new `GoogleService-Info.plist` (step 1a), open it and copy the value of `REVERSED_CLIENT_ID`. It looks like: `com.googleusercontent.apps.990782828495-xxxxxxxxxxxx`

### 3b. Update Info.plist

In `ios-app/LiveCoach/Info.plist`, replace `REPLACE_ME` in the URL scheme:

```xml
<key>CFBundleURLSchemes</key>
<array>
    <string>com.googleusercontent.apps.990782828495-xxxxxxxxxxxx</string>
</array>
```

Use the exact value from the plist — do not guess it.

### 3c. Verify in Firebase Console

**Firebase Console → Authentication → Sign-in method → Google:**
- Confirm it shows your iOS app's OAuth 2.0 client ID
- The SHA-1/SHA-256 fingerprint is not required for iOS (only Android)

---

## 4. Push Notifications (APNs → FCM)

The app is wired up to receive FCM tokens and send them to the proxy. Firebase just needs the APNs key.

### 4a. Create APNs key

**developer.apple.com → Certificates, Identifiers & Profiles → Keys:**
1. Click **+** → name it "Live Coach FCM"
2. Check **Apple Push Notifications service (APNs)**
3. Click **Continue** → **Register**
4. Download the `.p8` file — you can only download it once
5. Note the **Key ID** shown on the download page

### 4b. Upload to Firebase

**Firebase Console → Project Settings → Cloud Messaging → Apple app configuration:**
1. Under **APNs Authentication Key**, click **Upload**
2. Select the `.p8` file
3. Enter the **Key ID**
4. Enter your **Team ID** (found at developer.apple.com → Account → Membership — it's `DHB5JNF8ZW` from your Xcode settings)

### 4c. Xcode capability

In Xcode → **LiveCoach** target → **Signing & Capabilities:**
1. Click **+** → add **Push Notifications**
2. Click **+** → add **Background Modes** → check **Remote notifications**

(Remote notifications background mode is already in Info.plist so this may already be present.)

---

## 5. RevenueCat

### 5a. Create RevenueCat project

1. Sign in at app.revenuecat.com
2. **Create new project** → name it "Live Coach"
3. **Add iOS app** → enter bundle ID `com.konradgnat.lifecoachai`
4. Copy the **Public SDK key** (starts with `appl_`)

### 5b. Wire up the API key

In `ios-app/LiveCoach/Shared/Constants.swift`, the key is read from an environment variable:
```swift
static let revenueCatAPIKey = ProcessInfo.processInfo.environment["REVENUECAT_API_KEY"] ?? "REPLACE_ME"
```

**For development:** Set it in Xcode → Edit Scheme → Run → Arguments → Environment Variables:
- Key: `REVENUECAT_API_KEY`  
- Value: `appl_xxxxxxxxxxxxxxxxxxxx`

**For production builds / CI:** Set it as a build secret or use a Config.xcconfig file (recommended over hardcoding).

### 5c. Create the entitlement

**RevenueCat dashboard → your project → Entitlements:**
1. Click **+** → Identifier: `premium` (must match `Constants.Entitlements.premium` in code)
2. Add it

### 5d. Create products in App Store Connect

**appstoreconnect.apple.com → your app → In-App Purchases:**
1. Create a **subscription group** (e.g., "Live Coach Premium")
2. Add the subscriptions — two tiers × two periods (Standard weekly/yearly, Premium weekly/yearly). See `docs/pricing-plans-and-setup.md` for the exact product IDs and prices.
3. Note the product identifiers

### 5e. Connect products in RevenueCat

**RevenueCat → Offerings → Create offering:**
1. Create **Default** offering
2. Add packages and attach your App Store Connect product identifiers
3. Assign packages to the `premium` entitlement

### 5f. Upload App Store Connect API key to RevenueCat

RevenueCat needs this to validate receipts.
**RevenueCat → Project Settings → App Store Connect API:**
1. In App Store Connect → Users and Access → Integrations → App Store Connect API → Generate key
2. Upload to RevenueCat

---

## 6. VAPI

### 6a. Create VAPI account and get keys

1. Sign up at vapi.ai
2. **Dashboard → API Keys:** copy your **Private key** (for the proxy) and **Public key** (for the iOS app)

### 6b. Create the assistant

**VAPI Dashboard → Assistants → Create:**

Create one assistant that handles all call types (morning, evening, free). The system prompt is injected dynamically per call from the proxy — so set a minimal default system prompt here, e.g.:

```
You are a supportive AI life coach. Listen carefully and respond with warmth and clarity.
```

Configuration to set:
- **Voice:** Choose a voice (ElevenLabs or Cartesia work well)
- **Model:** GPT-4o or Claude 3.5 Sonnet (your call — Together AI is used for chat, but VAPI calls can use a different model)
- **First message:** "Hi! Ready for your check-in?" (or leave blank since the proxy overrides with context)
- **End call phrases:** "goodbye", "bye", "end call"
- **Max duration:** 600 seconds (10 min)

After creating, copy the **Assistant ID** (UUID format).

### 6c. Set up VAPI webhook (optional but recommended)

VAPI can send call-end webhooks to your proxy to save transcripts automatically.

**VAPI Dashboard → Assistants → your assistant → Advanced → Server URL:**
```
https://your-proxy-domain.com/vapi/webhook
```

Set a webhook secret and add it to the proxy `.env` as `VAPI_WEBHOOK_SECRET`.

### 6d. Update proxy .env

```
VAPI_API_KEY=<your private key from vapi.ai>
VAPI_ASSISTANT_ID=<the UUID from step 6b>
VAPI_WEBHOOK_SECRET=<your chosen secret>
```

### 6e. Update iOS Constants (VAPI public key)

In `ios-app/LiveCoach/Shared/Constants.swift`:
```swift
static let vapiPublicKey = ProcessInfo.processInfo.environment["VAPI_PUBLIC_KEY"] ?? "REPLACE_ME"
```

Set `VAPI_PUBLIC_KEY` as an Xcode environment variable (same approach as RevenueCat in §5b).

> Note: The iOS app currently connects to VAPI via WebSocket using a call token from the proxy — the `vapiPublicKey` constant exists but the current `VoiceCallService.swift` doesn't use it directly. The proxy's `VAPI_API_KEY` is what actually authenticates calls. You may not need to expose the public key to the iOS client unless you switch to the VAPI iOS SDK.

---

## 7. Remaining Proxy Setup

### 7a. Generate MASTER_ENCRYPTION_KEY

If not already done:
```bash
openssl rand -hex 32
```
Add to proxy `.env` as `MASTER_ENCRYPTION_KEY`.

### 7b. PostgreSQL

The proxy uses PostgreSQL for per-user encryption key storage (`DATABASE_URL` in `.env`).

**For local dev:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb livecoach
```
Set `DATABASE_URL=postgresql://localhost:5432/livecoach`

**For production:** Use Railway, Render, or Supabase (free tier is fine for early users).

### 7c. Run the proxy

```bash
cd proxy
npm install
npm run build
npm start
```

Or for dev with hot reload:
```bash
npm run dev
```

---

## Final Checklist

### iOS (Xcode)
- [ ] `GoogleService-Info.plist` downloaded for bundle ID `com.konradgnat.lifecoachai`
- [ ] `Info.plist` URL scheme updated with real `REVERSED_CLIENT_ID`
- [ ] **Sign in with Apple** capability added
- [ ] **Push Notifications** capability added
- [ ] `REVENUECAT_API_KEY` set in Xcode scheme environment
- [ ] `VAPI_PUBLIC_KEY` set in Xcode scheme environment (if needed)
- [ ] `PROXY_BASE_URL` set in Xcode scheme environment (e.g., `http://localhost:3000` for local dev)

### Firebase Console
- [ ] iOS app registered with `com.konradgnat.lifecoachai`
- [ ] Apple and Google sign-in methods enabled
- [ ] Firestore database created with security rules
- [ ] APNs key uploaded to Cloud Messaging

### Proxy `.env`
- [ ] `FIREBASE_PROJECT_ID` = `lifecoach-dea8c`
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` = base64 service account JSON
- [ ] `MASTER_ENCRYPTION_KEY` = 64-char hex
- [ ] `TOGETHER_AI_API_KEY` = your Together AI key
- [ ] `VAPI_API_KEY` = VAPI private key
- [ ] `VAPI_ASSISTANT_ID` = VAPI assistant UUID
- [ ] `VAPI_WEBHOOK_SECRET` = chosen secret
- [ ] `REVENUECAT_WEBHOOK_SECRET` = from RevenueCat dashboard
- [ ] `DATABASE_URL` = PostgreSQL connection string

### RevenueCat
- [ ] iOS app added
- [ ] `premium` entitlement created
- [ ] App Store Connect products linked
- [ ] Default offering created with packages
- [ ] App Store Connect API key uploaded

### VAPI
- [ ] Assistant created with voice and model configured
- [ ] Webhook URL set to proxy (optional)
- [ ] `VAPI_API_KEY` and `VAPI_ASSISTANT_ID` added to proxy `.env`

### Apple Developer Portal
- [ ] Sign in with Apple enabled for `com.konradgnat.lifecoachai`
- [ ] APNs key created and downloaded
- [ ] Push Notifications capability enabled for the App ID

---

## Together AI (already partially set up)

The proxy uses Together AI for text chat (Llama-3.3-70B). Just need the API key:

1. Sign in at api.together.xyz
2. **API Keys** → copy key
3. Add to proxy `.env`: `TOGETHER_AI_API_KEY=<key>`
