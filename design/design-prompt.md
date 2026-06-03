# Life Coach App — Design Prompt

**Platform:** iOS (iPhone)  
**Audience:** Ambitious 22–45 year olds working on a meaningful personal or professional goal  
**Tagline:** "Your AI life coach. Private by design."

---

## What the App Does

Soularc runs your week like a sprint. Each week you:
1. Have a **weekly planning + retrospective call** (Sunday evening) that reviews the past
   week and sets your **3 tasks for the week ahead**.
2. Each day, take two short voice standups:
   - a **midday check-in** (progress, roadblocks, recommit to today's 3 tasks)
   - an **evening debrief** (what got done, then plan tomorrow's 3 tasks)
3. Check tasks off as you complete them — weekly tasks and daily tasks.
4. Receive an **automatic weekly retrospective report** (what went well, what to improve,
   how to be 1% better).

The hierarchy is simple: **Week (3 tasks) → Day (3 tasks)**. There is no separate "project".

---

## Tone & Feel

- **Calm and premium** — like a high-end wellness app, not a productivity tool
- **Warm but direct** — not clinical, not corporate
- **Private and trustworthy** — the app's core differentiator is privacy; design should feel secure and intentional
- **Minimal** — users come here to focus, not to be overwhelmed

References: Calm, Linear, Things 3, Reflect

---

## Screens to Design

### Onboarding (4 screens)
1. **Welcome** — App name, tagline, 3 bullet points, "Get Started" CTA
2. **Privacy** — Headline about encryption, 3 trust bullets, "Continue" CTA
3. **Sign In** — Apple Sign In (primary), Google Sign In (secondary)
4. **How It Works** — 4 illustrated steps (weekly planning, midday check-in, evening debrief, automatic retrospective) + subscription paywall card (Weekly / Yearly)

### Main App (4 tabs)

**Home Tab**
- Greeting header (time-aware: "Good morning" / "Good evening")
- Daily score card — large number, color-coded (green ≥7, amber 4–6, red <4)
- Current week's 3 tasks as checkboxes
- Today's 3 tasks as checkboxes
- Next scheduled meeting (midday check-in / evening debrief / weekly planning)
- Streak counter + stats row

**Tasks Tab**
- Vertical list of **week cards** (ISO week-based)
- Current week card is **expanded and pinned to the top**: header shows "Week X" + date range,
  3 week-task checkboxes, then a list of the week's days with today expanded (3 day-task
  checkboxes with toggles); past days show as collapsed rows with score
- Past week cards appear collapsed below; tap to expand

**Calls Tab**
- List of past conversations (voice calls + text chats)
- Each row: call type (midday check-in / evening debrief / weekly planning / free), date,
  duration/message count, AI-generated 1-line summary
- Floating "New Conversation" button → sheet to choose call type or text chat

**Profile Tab**
- Subscription status + upgrade prompt
- **Weekly Retrospective Reports** — list of all auto-generated reports; tap → detail view
  (what went well / what to improve / 1% better / full narrative)
- Notification settings (configurable midday time, evening time, weekly planning weekday + time,
  and timezone)
- Sign out

### Conversation Screens
- **Text chat** — standard chat bubbles, streaming AI responses, clean input bar
- **Voice call (full-screen)** — large animated waveform, call duration, end call button

---

## Key Design Constraints

- **No user name displayed anywhere** — the AI does not know the user's identity; the app reflects this
- **Score is the hero metric** — it should feel meaningful and motivating, not gamified
- **3 tasks per week, 3 tasks per day** — the hierarchy is fixed; no multi-project complexity
- **Voice-first** — the weekly planning call, midday check-in, and evening debrief are the core UX; the call screen should feel important

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
