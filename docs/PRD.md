# Life Coach App — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-05-18  
**Platform:** iOS (Swift/SwiftUI)

---

## 1. Executive Summary

Life Coach App is an AI-powered personal coaching app that helps users make consistent daily progress on one meaningful life goal. Through short, structured morning and evening voice check-ins, the AI coach helps users plan their day, reflect on progress, and build momentum through daily micro-actions. All user data is end-to-end encrypted — the app cannot read your data even if it wanted to.

---

## 2. Problem Statement

Most self-improvement apps fail because:
- They overwhelm users with too many features and goals
- There is no accountability or real feedback loop
- Users don't know what to do each day to make progress
- Journaling and to-do apps are passive — they don't push back

**Life Coach App solves this with:** one goal, two daily calls, three micro-actions per day, and a score that holds you accountable.

---

## 3. Target User

- Age 22–45, ambitious but time-constrained
- Working on a meaningful personal or professional goal (career change, fitness, business, relationships, skill acquisition)
- Has tried journaling, coaching apps, or therapy but found them passive or too unstructured
- Willing to pay $15–25/month for meaningful accountability
- Comfortable with voice interfaces

---

## 4. Core Concept

**One project. Two calls. Three micro-actions. One score.**

1. **One project** — the user focuses on a single goal at a time
2. **Morning call (5–10 min)** — the coach reviews context and helps plan the day; AI generates 3 micro-actions
3. **Evening call (5–10 min)** — the user reports back; AI scores the day 0–10 and plans tomorrow
4. **Three micro-actions** — small, specific, completable tasks for the day tied to the project
5. **Daily score** — AI-generated 0–10 score displayed on the home dashboard

---

## 5. Navigation Structure

Bottom tab bar with four tabs:

| Tab | Icon | Purpose |
|-----|------|---------|
| Home | house | Daily dashboard: score, quote, streak, stats |
| Project | target | Current project + daily micro-actions history |
| Calls | mic | All chats/calls + start new conversation |
| Profile | person | Bio, settings, subscription, sign out |

---

## 6. Screen Specifications

### 6.1 Onboarding Flow (5 screens)

**Screen 1 — Welcome**
- App name and tagline: "Your AI life coach. Private by design."
- Three bullet points:
  - "Daily 5-minute voice check-ins with your personal AI coach"
  - "Three micro-actions every day that move you forward"
  - "Your data is encrypted. We cannot read it."
- CTA: "Get Started"

**Screen 2 — Privacy & Encryption**
- Headline: "Your conversations are yours alone."
- Body: "Life Coach App uses end-to-end encryption. Your conversations, goals, and progress are encrypted with a key only you control. We store ciphertext — not your words."
- Bullet list:
  - "Anonymous to AI — the AI never sees your name or email"
  - "Encrypted at rest — your Firebase data is unreadable without your key"
  - "No selling, no training — your data is never used to train AI models"
- CTA: "Continue"

**Screen 3 — Sign In**
- Headline: "Create your account"
- Apple Sign In button (primary)
- Sign in with Google button (secondary)
- Fine print: "By continuing you agree to our Terms and Privacy Policy."

**Screen 4 — Your Goal**
- Headline: "What do you want to work on?"
- Subtitle: "This is your one project. You can update it anytime."
- Large text input field with placeholder: "e.g. Launch my freelance business, Get in the best shape of my life, Find a relationship..."
- Voice input button (microphone icon) — records and transcribes
- CTA: "This is my goal →"
- Examples as tappable chips below (tap to fill): "Start a business", "Get fit", "Learn a skill", "Find a relationship", "Get a new job"

**Screen 5 — How It Works**
- Headline: "Here's your daily routine"
- Three illustrated steps:
  1. "Morning check-in (5 min) — plan your day and get your 3 micro-actions"
  2. "Complete your micro-actions — small steps that add up"
  3. "Evening check-in (5 min) — reflect, score, and set up tomorrow"
- Below: subscription paywall card
  - Plan options: Weekly (from $8.99/wk) | Yearly (from $299.99/yr — save ~36%)
  - Tiers: Standard (1 daily + weekly planning · 65 voice min/week) / Premium (2 daily + weekly planning · 115 voice min/week)
  - Includes: "Unlimited chat · daily & weekly voice coaching · weekly retrospective"
  - Free tier note: "Start free — 10 chat messages/day, no voice calls"
- CTA: "Start coaching" / "Try free"

---

### 6.2 Home Tab

**Layout (top to bottom):**

1. **Greeting header** — "Good morning, [first name]" or "Good evening, [first name]" based on time of day

2. **Daily score card** — shows today's score if evening call is complete, otherwise shows average score
   - Large number (e.g., "7.4") with label "Average Score"
   - Subtitle: "Based on [N] check-ins"
   - Color: green (≥7), amber (4–6), red (<4)

3. **Encouraging quote card** — rotated daily, pulled from a curated set or AI-generated; related to user's project theme
   - Italic quote text
   - Small label: "Your daily reminder"

4. **Project reminder pill** — single line showing the user's project title with a target icon
   - e.g., "🎯 Launch my freelance design business"

5. **Today's micro-actions** — three checkbox items
   - Shown if morning call is complete for the day
   - If morning call not yet done: "Complete your morning check-in to get today's actions"
   - Tapping checkbox marks it complete (synced to Firebase)

6. **Quick action buttons**
   - "Start morning check-in" (if before noon and morning call not done) or "Start evening check-in" (if after noon and evening call not done)
   - Button is prominent (full-width, primary color)

7. **Stats dashboard** (horizontal scroll cards or 2×2 grid):
   - "🔥 [N] day streak" — consecutive days with at least one completed micro-action
   - "✅ [N] days complete" — days with all 3 micro-actions done
   - "[N] micro-actions done" — all-time count
   - "🎙 [N] voice minutes" — total VAPI minutes used
   - "💬 [N] messages" — total chat messages exchanged

---

### 6.3 Project Tab

**Layout:**

1. **Project header card**
   - Title: user's project title (large, bold)
   - Description: 2–3 sentence AI-generated summary of the goal
   - "Edit project" link (opens a modal to update goal; triggers re-onboarding of VAPI context)
   - Created date

2. **Daily micro-actions log** — reverse-chronological list grouped by date
   - Each day shows: date label, day score badge (if evening call done), and 3 micro-action checkboxes
   - Completed items shown with strikethrough
   - Today's items are interactive; past items are read-only
   - Infinite scroll, loads 30 days at a time

3. **Progress note** — if fewer than 7 days of data, shows an encouraging prompt: "Keep going — your patterns will emerge after a week."

---

### 6.4 Calls Tab

**Layout:**

1. **Header** — "Conversations" title + "+" button top-right to start new chat

2. **Call type filter** — segmented control: "All | Voice | Chat"

3. **Conversation list** — each item shows:
   - Icon: mic (voice) or bubble (chat)
   - Date and time
   - Type label: "Morning check-in", "Evening check-in", or "Free chat"
   - Duration (voice) or message count (chat)
   - Brief AI-generated summary (1 line)

4. **Voice credits banner** (if on free tier or low on minutes):
   - "You have [N] voice minutes remaining this week"
   - "Buy more" link

5. **Start new conversation modal** (triggered by "+" button):
   - Option A: "Voice call" (uses VAPI) — shows minutes available
   - Option B: "Text chat" (uses Together AI)
   - Note: Voice requires subscription or credits

---

### 6.5 Conversation Detail Screen

Reachable from the Calls tab list. Works for both voice transcripts and text chats.

**Layout:**

1. **Header** — back button, conversation date/type, duration (if voice)

2. **Message list** — standard chat bubbles
   - User messages: right-aligned, primary color
   - AI messages: left-aligned, neutral color
   - Voice calls show the transcript as a chat log

3. **Score badge** — if this was an evening check-in, shows the day's score prominently at the bottom of the conversation: "Day Score: 8/10"

4. **Continue conversation** — if this is the most recent chat session, show a text input at the bottom to continue

5. **Voice calls**: show a "Play recording" button at the top if VAPI provides audio (or just show transcript)

---

### 6.6 Profile Tab

**Sections:**

1. **Profile header**
   - Avatar (from Google/Apple or initials)
   - Display name (editable)
   - Member since date

2. **My Goal** — link to edit project (same as Project tab edit)

3. **Subscription**
   - Current plan: Free / Standard / Premium (Weekly or Yearly)
   - Voice minutes: "[N] / [60] minutes used this week"
   - "Upgrade plan" or "Manage subscription" (opens RevenueCat paywall)
   - "Buy voice minutes" — purchase additional credits

4. **Settings**
   - Notification preferences:
     - Morning check-in reminder time (default: 8:00 AM)
     - Evening check-in reminder time (default: 9:00 PM)
     - Streak reminders (toggle)
   - Preferred language (for AI responses)

5. **Privacy & Data**
   - "View Privacy Policy"
   - "Export my data" — downloads encrypted archive
   - "Delete account" — confirmation dialog with 2-step confirmation

6. **Sign Out** button

---

## 7. Feature Specifications

### 7.1 Project Management

- A user has exactly **one active project** at a time
- Project is created during onboarding
- The project has:
  - `title` (string, max 100 chars)
  - `description` (AI-generated 2–3 sentence expansion, created immediately after onboarding)
  - `createdAt` timestamp
- Editing the project title triggers the AI to regenerate the description and update the VAPI agent's system prompt
- Projects are never deleted — if the user sets a new project, the old one is archived with `isActive: false` and all its session history is preserved

### 7.2 Daily Check-in Calls (VAPI Voice)

Each day consists of two structured voice calls:

**Morning Call:**
- Triggered by the user tapping "Start morning check-in"
- VAPI agent system prompt includes:
  - User's project title and description
  - Last 7 days of micro-actions and completion status
  - Yesterday's score (if available)
  - Any pending actions from yesterday
- Call flow:
  1. Greeting and brief encouragement (30 sec)
  2. "How are you feeling today?" — user responds
  3. Reflection on yesterday's actions (if applicable)
  4. Planning: "What can you do today to move your project forward?"
  5. AI proposes 3 micro-actions based on conversation
  6. User confirms or adjusts the 3 micro-actions
  7. Closing motivation (30 sec)
- At end of call: VAPI webhook fires a structured JSON payload with the 3 micro-actions to the proxy server, which saves them to Firebase for today's session

**Evening Call:**
- Triggered by the user tapping "Start evening check-in"
- VAPI agent system prompt includes:
  - Today's 3 micro-actions and current completion status
  - Full project context
  - Last 7 days of history
- Call flow:
  1. Greeting (15 sec)
  2. "How did today go?" — user responds
  3. Review each micro-action: "Did you [action]?"
  4. Celebration of wins, compassionate acknowledgment of misses
  5. Planning for tomorrow: "What will you focus on?"
  6. AI generates tomorrow's 3 micro-actions based on conversation
  7. AI gives a score 0–10 for the day with brief rationale
  8. Closing encouragement
- At end of call: VAPI webhook fires JSON payload with:
  - Day score (0–10) and rationale
  - Tomorrow's 3 micro-actions (pre-populated for the next morning call)
  - Updated micro-action completion status

### 7.3 Text Chat (Together AI)

- Available from the Calls tab → new conversation → "Text chat"
- Also available to continue any existing conversation
- Uses Together AI's best available Llama model (e.g., `meta-llama/Llama-3.3-70B-Instruct-Turbo`)
- System prompt (sent with every request) includes:
  - User's project title and description
  - Current micro-actions and completion status
  - Last 7 days of session summaries
  - Recent chat history (last 20 messages from this conversation)
  - "You are a warm, direct, and results-oriented life coach. You are anonymous — you do not know the user's name. Keep responses concise and actionable."
- Responses are streamed (SSE / streaming API)
- Free tier: 10 messages per day
- Paid tier: unlimited

### 7.4 Micro-Actions System

- Each day has exactly 3 micro-actions
- Micro-actions are:
  - Specific and completable in a single day
  - Connected to the user's active project
  - Generated by the AI during the morning or evening call
- Stored in Firebase under the day's session document
- Each micro-action:
  - `id`: UUID
  - `title`: string (max 150 chars)
  - `isCompleted`: boolean
  - `completedAt`: timestamp (nullable)
- Completion toggled from Home tab or Project tab
- Completion state is synced in real time via Firebase listeners

### 7.5 Daily Score

- Generated by the evening call AI
- Integer 0–10 with rationale text
- Scoring rubric (AI-guided):
  - 9–10: All 3 actions completed + meaningful progress beyond
  - 7–8: 2–3 actions completed, good effort
  - 5–6: 1–2 actions completed or partial effort
  - 3–4: Showed up for the call but limited completion
  - 0–2: No meaningful progress (reserved for exceptional cases — AI is encouraged to be generous)
- Displayed on Home tab as today's score or rolling average
- Displayed on Project tab next to each day's micro-actions

### 7.6 Streak System

- A day "counts" toward the streak if the user completes at least 1 micro-action
- Streak resets if a day passes with 0 completions
- Grace period: if the user completes all 3 actions before midnight of the next day, the previous day counts (to handle late-night users)
- Streak displayed on Home tab

### 7.7 Subscription & Credits (RevenueCat)

**Free Tier:**
- 10 text chat messages per day
- No voice calls
- Access to Home, Project, Calls (text only), Profile tabs
- Paywall shown when voice is attempted or daily message limit reached

**Standard — $8.99/week or $299.99/year (≈ $25/mo, save ~36%):**
- Unlimited text chat
- 1 daily check-in + weekly planning call
- 65 voice minutes per week (VAPI)
- Weekly retrospective

**Premium — $14.99/week or $499.99/year (≈ $41.67/mo, save ~36%):**
- Unlimited text chat
- 2 daily check-ins + weekly planning call
- 115 voice minutes per week (VAPI)
- Weekly retrospective

**Voice Credit Packs (one-time purchase):**
- 30 minutes — $4.99
- 120 minutes — $14.99
- Minutes roll over; never expire

**Voice minute accounting:**
- VAPI call duration is tracked per call via webhook
- Stored as `voiceMinutesUsed` (integer seconds) in user profile
- Weekly quota resets every Monday 00:00 UTC
- If quota exhausted mid-call: call is allowed to complete but a warning is shown; next call requires purchase

### 7.8 Push Notifications

- Morning check-in reminder (user-configured time, default 8:00 AM)
- Evening check-in reminder (user-configured time, default 9:00 PM)
- Streak at-risk warning: "Don't break your [N]-day streak — check in tonight!"
- Motivational nudge if no micro-actions completed by 6:00 PM
- Weekly summary: "This week: [N] actions completed, avg score [X]"

---

## 8. Data Privacy & Encryption

### Core promise to users:

> "We cannot read your data. Not because we choose not to — because the encryption makes it technically impossible."

### Implementation:

- All user-generated content (project title, description, micro-actions, chat messages, VAPI transcripts) is encrypted before being written to Firebase
- Encryption uses AES-256-GCM
- Per-user encryption keys are generated at account creation and stored in the proxy server's secure key store (not in Firebase)
- The iOS app never touches plaintext Firebase data directly — all reads and writes go through the proxy server
- The AI models (Together AI, VAPI) receive plaintext data only for the duration of the API request — it is not logged or retained
- Data anonymization: the AI never receives the user's name, email, or auth identifier — only an opaque anonymous user ID

### What is NOT encrypted:
- User auth UID (Firebase Auth)
- Subscription status (RevenueCat)
- Voice minutes used (numeric counter)
- Timestamps and date indexes (needed for Firebase queries)

---

## 9. Onboarding Flow (Detailed)

| Step | Screen | Required Input | Output |
|------|--------|---------------|--------|
| 1 | Welcome | None | User sees value prop |
| 2 | Privacy | None | User understands encryption |
| 3 | Sign In | Apple or Google auth | Firebase user created, encryption key generated on proxy |
| 4 | Your Goal | Text or voice input | Project document created in Firebase (encrypted) |
| 5 | How It Works + Paywall | Subscription choice | RevenueCat entitlement set; VAPI assistant initialized |

After completing onboarding, user lands on the Home tab with a prompt: "Start your first morning check-in."

---

## 10. AI Coaching Persona

- Name: unnamed (referred to as "your coach")
- Tone: warm, direct, no-nonsense, results-oriented
- Does not use filler phrases like "Absolutely!" or "Great question!"
- Asks one question at a time
- Celebrates wins without being sycophantic
- Does not lecture or moralize about missed actions
- Uses the Socratic method to help users identify their own blockers
- Voice: natural, conversational, not robotic

---

## 11. Success Metrics

| Metric | Target (90-day post-launch) |
|--------|----------------------------|
| D1 retention | ≥60% |
| D7 retention | ≥35% |
| D30 retention | ≥20% |
| Avg calls per week per active user | ≥8 (approx 4 per day × 2) |
| Subscription conversion (free → paid) | ≥12% |
| Monthly churn (paid) | ≤8% |
| Avg daily score | ≥6.5 |
| Avg streak length | ≥5 days |

---

## 12. Non-Goals (v1.0)

- Multiple simultaneous projects (by design — one project is a core feature)
- Social/community features
- Integration with calendar apps
- Wearable support
- Android app
- Web app
- Group coaching
- Human coach escalation
- Habit tracking beyond micro-actions

---

## 13. Open Questions

1. Should evening call generate tomorrow's micro-actions, or wait until morning call?
   - **Recommendation:** Evening call generates tomorrow's actions, morning call refines them. This gives users a sense of direction when they wake up.

2. What happens if a user misses a day entirely?
   - **Recommendation:** Streak resets. The next morning call acknowledges the gap without judgment and starts fresh.

3. How many days of history does VAPI context include?
   - **Recommendation:** Last 7 days of micro-actions + scores. Summaries only to keep token count manageable.

4. Should voice call recordings be stored?
   - **Recommendation:** No — VAPI provides a transcript via webhook. Store transcript only (encrypted). No audio retention.
