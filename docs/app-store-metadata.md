# Soularc — App Store Metadata

Source of truth for every text/asset field in **App Store Connect**. Copy derived from the
landing page (`landing/`) and the shipping pricing plans (`docs/pricing-plans-and-setup.md`).
Character limits are Apple's hard caps — counts shown are current usage.

Last updated: 2026-06-03.

---

## 1. App information (set once, mostly fixed)

| Field | Value | Limit |
|-------|-------|-------|
| **App Name** | `Soularc` | 30 |
| **Subtitle** | `Plan the week. Win the day.` | 30 (27 used) |
| **Bundle ID** | `com.konradgnat.lifecoachai` | — |
| **SKU** | `soularc-ios-01` | — |
| **Primary category** | Health & Fitness | — |
| **Secondary category** | Productivity | — |
| **Primary language** | English (U.S.) | — |
| **Copyright** | `2026 Soularc` | — |

> **Category note:** "Health & Fitness" matches the goal/habit/accountability positioning and
> ranks against habit + wellness apps. If review pushes back on health claims, fall back to
> **Lifestyle** (primary) / **Productivity** (secondary). We make no medical claims anywhere.

---

## 2. Listing copy

### Promotional Text (170 chars — editable any time without a new build)
> Your AI coach for the week. One planning call sets 3 goals, daily check-ins build your 3
> tasks a day, and a weekly retro closes the loop. Private by design.

*(159 chars)*

### Description (4000 chars max)

```
Soularc is your AI life coach for the week — a voice-first system that turns big goals into a plan you actually run, one day at a time.

Plan the week. Win the day. Every week.

HOW IT WORKS
• Weekly planning call — Once a week, a 5-minute voice call sets your 3 goals for the week. Everything else ladders up to these.
• Midday check-in — Tell your coach what you got done, what's next, and any blockers. It turns your day into a checklist of 3 tasks, all aligned to the week.
• Evening debrief — Report what you finished, check off your tasks, and plan tomorrow. Each day closes with a 0–10 score.
• Weekly retrospective — A retro call reviews how the week went — what worked, what to improve — then rolls straight into planning next week's goals.

TALK IT OUT, HANDS-FREE
Voice is the heart of Soularc. Speak to your coach like a real conversation — no typing, no forms, no friction. Prefer text? Switch to chat anytime.

ONE GOAL AT A TIME
No endless backlog. Soularc keeps you focused on 3 goals a week and 3 tasks a day, so progress is obvious and momentum compounds.

SEE YOUR ARC
Every call and chat lives in one place. Your daily score and weekly retros show the line between where you were and where you're going.

PRIVATE BY DESIGN
The deepest conversations need the strongest privacy.
• Anonymous to the AI — the coach never sees your name, email, or anything that identifies you.
• Encrypted at rest and in transit — your goals, conversations, and reflections are stored as ciphertext. Your key never touches our servers.
• Never used for training — your data is yours. We don't sell it, share it, or feed it to AI models. Wipe it anytime.

WHO IT'S FOR
For people who run their week with intention — a career change, starting a business, training for a half marathon, writing a book, learning a language, or just sleeping before 11pm. Soularc works when you show up, week after week.

MEMBERSHIP
Soularc is a subscription. Standard and Premium tiers are available weekly or yearly, with a weekly voice allowance on each. Pick the cadence that fits your week and change it anytime.

Plan the week. Win the day. Find your arc.
```

### Keywords (100 chars, comma-separated, no spaces)
```
life coach,goals,habits,accountability,AI coach,voice,planning,weekly,productivity,journal,focus,checkin
```

*(verify ≤100 chars in App Store Connect before saving; do not repeat the app name or category)*

### What's New (version release notes, 4000 chars)
```
First release of Soularc. Plan your week with a voice call, build 3 tasks a day with daily check-ins, and close each week with a retrospective. Private by design — end-to-end encrypted, anonymous to the AI.
```

---

## 3. URLs

| Field | Value |
|-------|-------|
| **Marketing URL** | `https://soularc.xyz` |
| **Support URL** | `https://soularc.xyz/support` *(create page or route)* |
| **Privacy Policy URL** | `https://soularc.xyz/privacy` *(required — must be live before submission)* |

---

## 4. In-App Purchases (display name + description per product)

Product IDs and pricing are the shipping set from `docs/pricing-plans-and-setup.md`.
Each IAP needs its own localized **display name** (30 chars) and **description** (45 chars).

| Product ID | Display name | Description |
|------------|--------------|-------------|
| `soularc_standard_weekly` | `Standard — Weekly` | `Weekly planning + 1 daily check-in. 65 min/wk.` |
| `soularc_standard_yearly` | `Standard — Yearly` | `Weekly planning + 1 daily check-in. 65 min/wk.` |
| `soularc_premium_weekly` | `Premium — Weekly` | `Weekly planning + 2 daily check-ins. 115 min/wk.` |
| `soularc_premium_yearly` | `Premium — Yearly` | `Weekly planning + 2 daily check-ins. 115 min/wk.` |

> Descriptions above run slightly over 45 chars — trim to e.g.
> `Planning + 1 daily check-in · 65 min/wk` (Standard) and
> `Planning + 2 daily check-ins · 115 min/wk` (Premium) when entering them.

**Review notes for IAP / subscription metadata (App Store requires this near the buy button
and in the binary):** subscription title, length, price, and a link to Terms of Use (EULA)
and Privacy Policy must appear in-app on the paywall. See `design/paywall-design-prompt.md`.

---

## 5. App privacy ("nutrition label")

Declare in App Store Connect → App Privacy. Reflects the encrypted-by-design architecture.

| Question | Answer |
|----------|--------|
| Data used to track you | **None** |
| Data linked to you | **None** — payload is encrypted before it reaches our servers; the AI is anonymous |
| Data **not** linked to you | Purchases (subscription status), Identifiers (anonymous user ID), Diagnostics (crash/perf) — used for App Functionality and Analytics only |
| Used for third-party advertising | No |
| Used for training AI models | No |

> Voice audio is processed by our voice provider (VAPI) to run the call but is not stored
> linked to identity; transcripts are encrypted at rest. Confirm exact processor disclosures
> with `docs/architecture.md` before finalizing the privacy questionnaire.

---

## 6. Age rating

Target **12+** (infrequent/mild mature themes possible in open-ended coaching conversation).
No objectionable content, no user-generated content shown to others, no gambling. Confirm via
the App Store Connect questionnaire.

---

## 7. Demo account for App Review

Apple requires a working account behind the paywall. Provide:
- A test Apple ID / sandbox account, **or**
- An in-app promo path (e.g. the `NS2026` coupon → RevenueCat lifetime promo entitlement,
  per `docs/pricing-plans-and-setup.md`) plus written steps so the reviewer can reach the
  full experience without paying.

Add reachable steps in **App Review Information → Notes**.
```
