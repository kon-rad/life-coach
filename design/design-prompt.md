# Life Coach App — Design Prompt

**Platform:** iOS (iPhone)  
**Audience:** Ambitious 22–45 year olds working on a meaningful personal or professional goal  
**Tagline:** "Your AI life coach. Private by design."

---

## What the App Does

Life Coach App helps users make daily progress on one goal at a time. Every day they:
1. Have a short **morning voice call** with their AI coach (5–10 min)
2. Complete **3 micro-actions** — small, specific tasks set by the AI
3. Have a short **evening voice call** to reflect and get scored 0–10

That's the entire loop. Simple, focused, daily.

---

## Tone & Feel

- **Calm and premium** — like a high-end wellness app, not a productivity tool
- **Warm but direct** — not clinical, not corporate
- **Private and trustworthy** — the app's core differentiator is privacy; design should feel secure and intentional
- **Minimal** — users come here to focus, not to be overwhelmed

References: Calm, Linear, Things 3, Reflect

---

## Screens to Design

### Onboarding (5 screens)
1. **Welcome** — App name, tagline, 3 bullet points, "Get Started" CTA
2. **Privacy** — Headline about encryption, 3 trust bullets, "Continue" CTA
3. **Sign In** — Apple Sign In (primary), Google Sign In (secondary)
4. **Your Goal** — Large text input, voice input button, tappable example chips
5. **How It Works** — 3 illustrated steps + subscription paywall card (Monthly / Annual)

### Main App (4 tabs)

**Home Tab**
- Greeting header (time-aware: "Good morning" / "Good evening")
- Daily score card — large number, color-coded (green ≥7, amber 4–6, red <4)
- Today's 3 micro-actions as checkboxes
- Start morning/evening call button (context-aware)
- Streak counter + stats row

**Project Tab**
- Current project title and description
- History of daily sessions (date, score, actions)
- Edit project button

**Calls Tab**
- List of past conversations (voice calls + text chats)
- Each row: type, date, duration/message count, AI-generated 1-line summary
- Floating "New Conversation" button → sheet to choose text chat or voice call

**Profile Tab**
- Subscription status + upgrade prompt
- Notification settings (morning/evening reminder times)
- Sign out

### Conversation Screens
- **Text chat** — standard chat bubbles, streaming AI responses, clean input bar
- **Voice call (full-screen)** — large animated waveform, call duration, end call button

---

## Key Design Constraints

- **No user name displayed anywhere** — the AI does not know the user's identity; the app reflects this
- **Score is the hero metric** — it should feel meaningful and motivating, not gamified
- **One active project at a time** — no multi-project complexity
- **Voice-first** — morning/evening calls are the core UX; the call screen should feel important

---

## Color Direction (open to interpretation)

- Dark mode primary with optional light mode
- One strong accent color (something that reads as "focus" or "momentum" — deep blue, forest green, or rich indigo)
- Avoid bright neons or playful palettes

---

## Deliverables Requested

1. Component library (typography, colors, buttons, cards, input fields)
2. All screens above at iPhone 15 Pro resolution
3. Light and dark mode variants for the main app screens
4. Key interaction: the voice call screen animated state
