# Soularc — App Store Screenshot Brief (for the design team)

Goal: a set of App Store screenshots that sell the **voice-first, weekly-planning, private-by-design**
system in a single scroll. Copy and visual language come from the landing page (`landing/`) and
`docs/app-store-metadata.md`. Mockups already exist in `landing/components/PhoneMock.tsx`
(`MockHome`, `MockCall`, `MockProject`, `MockConversations`) — reuse those screen states as the
in-device content so the store and the site tell the same story.

---

## Deliverables & specs

Apple uploads (provide at native resolution, no rounded corners baked in, sRGB, PNG/no alpha):

| Device class | Required size (portrait) | Notes |
|--------------|--------------------------|-------|
| 6.9" iPhone (16 Pro Max / 15 Pro Max) | **1320 × 2868** | Primary set — required |
| 6.5" iPhone (fallback) | 1242 × 2688 | Apple can scale 6.9"; provide if time allows |
| iPad 13" (only if iPad supported) | 2064 × 2752 | Skip if iPhone-only at launch |

- **Count:** design **6 screenshots** (Apple allows up to 10; first 3 carry the pitch — they're
  what shows in search). Order matters; ship in the order below.
- **Format:** "framed marketing" style — device frame on a branded background with a short
  headline above each phone. Not raw screen grabs.
- Also export a **clean unframed** version of each device screen for reuse.

## Brand & visual system (match the landing page)

- **Background:** near-black `#08080B`–`#0E0E12`, with a soft radial accent glow per the site.
- **Accent color:** pull from `landing/lib/theme.ts` (`ACCENT`) — use it for the glow, mic/voice
  states, and small highlights only. Keep it restrained.
- **Text:** off-white `#F5F5F7` for headlines; muted `rgba(245,245,247,0.45–0.65)` for the
  second clause / supporting line.
- **Type:** Geist Sans (headlines, tight tracking ≈ -1.2 to -1.8), Geist Mono for tiny
  labels/numerals. Mirrors the web.
- **Headline pattern:** strong first line in white + a softer grey second clause, exactly like
  the hero ("Plan the week. / Win the day. / *Every week.*").
- **Tone:** calm, premium, Apple-grade. Lots of negative space. No stock photos, no emoji,
  no busy gradients.

---

## The 6 screenshots

For each: **Headline** (≤ 6 words, big), optional **subhead** (one short line), and the
**screen state** to show inside the device.

### 1 — Hero / what it is  *(most important — first in search)*
- **Headline:** Plan the week. Win the day.
- **Subhead:** Your AI coach, one week at a time.
- **Screen:** `MockHome` — today's view with the 0–10 daily score and the 3 tasks visible.

### 2 — The weekly planning call
- **Headline:** One call sets your 3 goals.
- **Subhead:** A 5-minute weekly planning call.
- **Screen:** `MockCall` (listening = true) — live voice UI with waveform / mic active.

### 3 — Daily check-ins → 3 tasks
- **Headline:** Talk it out, hands-free.
- **Subhead:** Daily check-ins build your 3 tasks a day.
- **Screen:** `MockCall` mid-conversation, or a split showing a check-in turning into a checklist.

### 4 — Tasks, weekly + daily
- **Headline:** Three tasks. No noise.
- **Subhead:** Weekly and daily tasks in one place. Check them off as you go.
- **Screen:** `MockProject` — week card with the 3 weekly goals and today's 3 tasks, some checked.

### 5 — Your arc / history
- **Headline:** See your arc.
- **Subhead:** Every call and chat, and a score for every day.
- **Screen:** `MockConversations` — list of past calls/chats; consider a small score trend element.

### 6 — Privacy  *(the differentiator — strong closer)*
- **Headline:** We can't read your data.
- **Subhead:** End-to-end encrypted. Anonymous to the AI. Never used for training.
- **Screen:** `MockHome` blurred/dimmed behind a lock motif, or a clean "trust certificate" card
  echoing the landing `PrivacySection` (3 bullets: anonymous to the AI · encrypted at rest and
  in transit · never used for training).

---

## App Preview video (optional, do if bandwidth allows)

- 15–30s, portrait, same device sizes as screenshots.
- Beat sheet: open the app → start the weekly planning call (voice waveform) → goals appear →
  daily check-in → 3 tasks check off → daily score → end on the privacy line "We can't read
  your data."
- Captions on (most previews are watched muted). Same type/brand system as above.

---

## Do / Don't

**Do**
- Lead with voice — show the call UI early; it's the hero moment.
- Keep each screenshot to one idea and one headline.
- Use real product UI states (the PhoneMocks), not invented screens.
- Keep the privacy screen visually distinct so it lands as the closer.

**Don't**
- Don't make medical/clinical claims or use "therapy" language.
- Don't show real names, emails, or anything implying we can see user data (it contradicts the
  privacy promise).
- Don't overcrowd with feature lists — the description does that, screenshots sell the feeling.
- Don't bake device corner radii / status-bar clocks that conflict with Apple's frames.

---

## Handoff checklist
- [ ] 6 framed screenshots @ 1320 × 2868 (6.9")
- [ ] 6 clean unframed screen exports
- [ ] Localized headline text layers kept editable (separate from device art)
- [ ] (Optional) App Preview video per device size
- [ ] Source file (Figma) link added here when ready
