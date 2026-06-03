# Soularc — Paywall Design Prompt (Standard & Premium · Weekly & Yearly)

**Platform:** iOS (iPhone), dark-mode first
**Surface:** The subscription paywall (`SubscriptionPaywallView`) — shown from the
onboarding "How It Works" step and from Profile → "Soularc Plus".
**Goal:** Convert a free user into a paying subscriber. Make **Premium / Yearly** the
obvious best value without making Standard feel punitive.

---

## What the user is buying

Soularc is an **AI life coach**: a weekly planning + retrospective voice call, daily
midday/evening voice check‑ins, 3 weekly + 3 daily tasks, and a daily 0–10 score. Core
differentiator: **all user data is end‑to‑end encrypted — "we can't read your data."**

The subscription pays for **AI voice coaching minutes** (the headline benefit) plus
unlimited text chat with the coach.

---

## The plans to present

**Two tiers × two billing periods = 4 options on this screen.** Same features within a
tier; only the cadence and price change.

| Tier | What's included | Weekly | Yearly |
|------|-----------------|--------|--------|
| **Standard** | 1 daily check‑in + weekly planning call · **65 voice min/week** · unlimited text chat · weekly retrospective | **$8.99 / week** | **$299.99 / year** (≈ $25.00/mo) |
| **Premium** | **2 daily check‑ins** (midday + evening) + weekly planning · **115 voice min/week** · unlimited text chat · weekly retrospective · priority | **$14.99 / week** | **$499.99 / year** (≈ $41.67/mo) |

**Savings to surface on the Yearly options:**
- Standard yearly vs paying weekly all year ($8.99 × 52 = $467.48) → **save ~36%**
- Premium yearly vs weekly ($14.99 × 52 = $779.48) → **save ~36%**
- Frame yearly as **"Save ~36%"** / **"Best value"**.

**Recommended default selection:** **Premium · Yearly**, pre‑highlighted.

---

## Brand & visual system (use these exact tokens)

Dark, calm, premium — closer to a high‑end wellness app than a productivity tool.
References: **Calm, Linear, Things 3, Reflect**. Avoid neon, gradients-as-decoration,
playful illustration, or "growth-hack" urgency.

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#0A0A0C` | screen base |
| Surface | `#131316` | cards |
| Sunken | `#1C1C20` | insets, unselected segments |
| **Accent** | `#4F5DFF` (rich indigo) | selected plan, primary CTA, checkmarks |
| Text | `#F5F5F7` | primary text |
| Text dim | white @ 62% | secondary |
| Text faint | white @ 36% | captions, legal |
| Hairline | white @ 8% | dividers, card borders |
| Green | `#34C759` | savings badge / "included" ticks (use sparingly) |

Type: **SF Pro**. Cards: 22px corner radius, 0.5px hairline border, `#131316` fill.
Primary button: full‑width, 54px tall, 16px radius, accent fill, soft accent glow shadow.
Spacing is generous; one strong accent only.

---

## Screen anatomy (top → bottom)

1. **Header** — short value headline + subhead.
   - e.g. **"Coaching that actually moves the week."** / "Unlock voice coaching, daily
     accountability, and your weekly retrospective."
   - Optional small lock chip: "🔒 Private by design — end‑to‑end encrypted."
2. **Billing-period toggle** — a segmented control: **Weekly | Yearly**. Selecting
   **Yearly** reveals the savings badge. (This switches the price shown on both tier cards.)
3. **Two tier cards: Standard & Premium.**
   - Each card: tier name, one‑line positioning, the price for the selected period (large),
     the per‑unit sub‑line (e.g. "$25.00/mo billed yearly" or "billed weekly"), and a
     **3–4 item feature list** with accent checkmarks.
   - **Premium card is visually elevated** (accent border / subtle accent wash / "Most
     popular" ribbon). Selected card shows an accent ring + filled radio.
4. **Feature comparison** (optional but recommended) — a compact "Standard vs Premium"
   row group so the upgrade reason is obvious: daily check‑ins (1 vs 2), weekly planning
   (✓ vs ✓), voice minutes (65 vs 115/wk), unlimited chat (✓ vs ✓), weekly retrospective
   (✓ vs ✓), encryption (✓ vs ✓).
5. **Primary CTA** — accent button reflecting the selection: **"Start Premium — $499.99/yr"**
   (or "Continue"). If a free trial is enabled later, label becomes "Try free for 7 days".
6. **Secondary actions row** — **"Restore purchases"** and **"Redeem a code"** (the app has
   a promo‑code flow — keep this entry point on/near the paywall).
7. **Legal footer (required, faint text):** auto‑renew disclosure + **Terms of Use (EULA)**
   and **Privacy Policy** links. Exact copy below.

---

## Layout directions to explore (give us 2–3)

- **A — Period toggle + 2 tier cards (recommended):** Weekly|Yearly segmented control at
  top; Standard & Premium cards below; Premium pre‑selected. Cleanest for 4 options.
- **B — 2 tier cards, each with both prices inline:** each card shows Weekly and Yearly as
  two selectable rows inside it. More scannable comparison, denser.
- **C — Single hero (Premium/Yearly) + "See all plans":** lead with the recommended plan
  full‑bleed; a quiet link expands the other three. Highest focus, fewer choices upfront.

For each, deliver the **default state** plus the **alternate period selected**.

---

## Microcopy starting points (designers may refine)

- Headline: "Coaching that actually moves the week."
- Standard positioning: "Daily accountability + your weekly plan."
- Premium positioning: "Twice‑daily coaching for the ambitious."
- Yearly badge: "BEST VALUE · SAVE ~36%" or "≈ 2 months free".
- CTA: "Start Premium" / "Start Standard" / "Continue".
- Reassurance line under CTA: "Cancel anytime. Your data stays encrypted."
- **Required legal (verbatim pattern):** "Payment is charged to your Apple ID. Subscriptions
  auto‑renew unless turned off at least 24h before the end of the period. Manage or cancel in
  Settings." + **Terms of Use** and **Privacy Policy** links.

---

## States to design

- **Default** (Premium/Yearly preselected) · **Weekly selected** · **Standard selected**
- **Loading** (prices fetching — show skeleton, not "$0.00")
- **Purchasing** (CTA spinner / dimmed overlay)
- **Success** ("Welcome to Soularc Plus 🎉" toast → dismiss)
- **Error** ("Purchase failed — please try again")
- **Already subscribed** (entry point shows current plan + "Manage subscription")
- **Redeem code sheet** (small modal: code field + Redeem + result message)

---

## Hard constraints

- **No user name / personal identity anywhere** — the coach doesn't know who they are; the
  app reflects that (privacy is the brand).
- **Voice minutes are the hero benefit** — lead the feature lists with them.
- Don't invent features. The real differentiators are: voice check‑ins, weekly planning +
  retrospective, daily score, unlimited chat, and **encryption**.
- Apple compliance is non‑negotiable: title, duration, price, price‑per‑period, auto‑renew
  disclosure, Terms (EULA) + Privacy links, and Restore must all be visible on the paywall.
- Prices shown here are placeholders for layout — the live app pulls localized prices from
  the store, so design must tolerate longer strings (e.g. "₩650,000/년").

---

## Deliverables

1. The 2–3 layout directions above, at **iPhone 15 Pro** resolution, **dark mode** (light
   mode optional secondary).
2. All states listed above for the chosen primary direction.
3. The reusable components: period toggle, tier/plan card (selected + unselected), feature
   row, savings badge, primary CTA, legal footer.
4. Redeem‑code sheet.
5. Spacing/redlines + the token mapping above so it drops into the existing SwiftUI design
   system (`DesignSystem.swift`).

---

> **Eng note (not for the mockup):** the app sells **Weekly + Yearly only** — four products
> (Standard/Premium × Weekly/Yearly), IDs in `Constants.Products` and the proxy's
> `subscriptionTiers.ts`. `SubscriptionView` already renders these four by product identifier.
> Create the same four product IDs in App Store Connect + RevenueCat. There is no monthly product.
