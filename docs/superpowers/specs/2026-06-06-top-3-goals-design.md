# Top 3 Goals — Design

**Date:** 2026-06-06
**Status:** Approved

## Summary

Let the user define up to **3 long-term goals** (title + optional description + optional
target date). Goals are shown on the Home screen directly under the score card, edited via a
single modal that holds all three at once, stored encrypted on the user doc, and injected into
the system prompt for **every** coach call so the AI can tie weekly/daily tasks back to the
bigger picture.

## Data model

A `Goal` is `{ id, title, description, dueDate }`:

- `id` — UUID (server-assigned if missing on write).
- `title` — required; trimmed, capped at 120 chars. Empty-title entries are dropped.
- `description` — optional; capped at 500 chars. Stored/returned as `""` when absent.
- `dueDate` — optional ISO `yyyy-MM-dd` calendar date. Stored/returned as `""` when absent;
  any value not matching `^\d{4}-\d{2}-\d{2}$` is coerced to `""`.

`description`/`dueDate` are always present as strings (empty = none) so the iOS client can
decode them as non-optional `String` without the "data couldn't be read" class of failures.

## Storage (proxy / Firebase)

Goals live as a single **encrypted JSON array** in a new `goals` field on `users/{uid}` — the
same pattern as `notificationSettings`. No new collection. The whole array is read/written
atomically. A `normalizeGoals()` helper enforces the rules above on both read and write
(guards legacy/garbled data) and caps the array at 3.

## API (proxy)

- `GET /user/goals` → `{ goals: Goal[] }` (decrypted + normalized; `[]` if none).
- `PUT /user/goals` → body `{ goals: Goal[] }`; normalizes, re-encrypts, writes with
  `{ merge: true }`, returns `{ goals: Goal[] }` (the normalized set).

Replace-all rather than per-goal CRUD, because the UI saves the full set in one action.

## Prompt injection (proxy)

- `prompts.ts`: add an optional `goals?: PromptGoal[]` (`{ title, description, dueDate }`) to
  `CallPromptContext`, plus a `formatGoalsSection()` helper. When goals exist, every builder
  (midday, evening, weekly normal + first-session, free) gets a "top long-term goals" block
  with a line instructing the coach to connect weekly/daily tasks to them. When empty, the
  block is omitted entirely.
- `routes/vapi.ts`: `init-call` already reads the user doc for the quota gate — reuse that
  same `userData` to decrypt `goals` (zero extra Firestore reads), map to `PromptGoal[]`, and
  pass into the context.

## iOS

- `Models/Goal.swift` — `struct Goal: Codable, Identifiable, Sendable` + `GoalsResponse`
  wrapper.
- `Services/GoalService.swift` — `@MainActor @Observable`, `load()` + `save(_:)` via
  `ProxyAPIClient` (created, not environment-injected, mirroring `WeekService`).
- `HomeViewModel` — holds `goals: [Goal]`, loads them in `load()`, exposes `saveGoals(_:)`.
  Demo mode supplies sample goals.
- `HomeView` — a new `LCCard` "Goals" section directly under the score card. Shows up to 3
  goals (title + due date) or a "Create your goals" prompt when empty. Tapping opens the
  editor sheet.
- `Features/Home/GoalsEditorView.swift` — `.sheet` + `NavigationStack` with 3 fixed rows
  (title `TextField`, description `TextField`, optional date toggle + `DatePicker`),
  pre-filled from existing goals, Cancel/Save in the toolbar. Save maps non-empty rows to
  `Goal` and calls back into the view model.

## Tests

Proxy jest:
- `prompts.test.ts` — goals appear in a built prompt when provided; section omitted when none.
- `user.test.ts` — `GET`/`PUT /user/goals` round-trip (encryption mocked); empty-title rows
  dropped; array capped at 3.
- `vapi.test.ts` — goals on the user doc surface in the returned `systemPrompt`.

iOS is verified by `xcodegen generate` + `xcodebuild` (no unit-test harness for this layer).
