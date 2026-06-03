# Day-Centric Tasks Redesign — Design

**Date:** 2026-06-03
**Status:** Approved (design); pending spec review
**Supersedes (UI):** the week-list Tasks view from `2026-05-31-weekly-daily-tasks-redesign-design.md`. The weekly+daily data model and call structure from that spec are unchanged; this spec redesigns the Tasks UI, expands day tasks beyond 3, and replaces the evening-call scoring with a dedicated day-scoring LLM call that also produces personalized advice.

## Goal

Reorient the Tasks experience around a **week selector + per-day detail** instead of a scrollable list of week cards. Each day becomes a first-class screen showing its tasks, score, summary, coach advice, and the calls that happened that day. Day tasks become unbounded (the coach creates them; the user can also add/edit/delete and toggle). The day score, day summary, and personalized advice are produced by a Together AI (Llama 3.3 70B) call at the conclusion of the evening check-in.

## Non-goals

- No change to the weekly+daily call structure (midday/evening/weekly/free) or VAPI prompt-injection mechanism.
- No change to the encryption model — all new fields are encrypted by the proxy before touching Firebase.
- Week tasks stay exactly 3. Only **day** tasks become unbounded.
- No re-hosting of audio; call recording playback continues to use the existing encrypted VAPI recording-URL pointer.

---

## 1. Data model changes

### Session (`sessions` Firestore doc + iOS `DailySession`)

| Field | Change |
|-------|--------|
| `advice` | **NEW.** `string?`, AES-encrypted at rest, decrypted on read. Personalized day advice from the scoring call. |
| `summary` | Unchanged role: the **day summary** (2–4 sentence recap). |
| `score` | Unchanged: `Int?` 0–10. |
| `scoreRationale` | **Deprecated in UI.** Still read for back-compat; no longer written by the new scoring path; no longer displayed. |
| `tasks` | Unchanged shape (`DayTask[]`), now **unbounded** (no 3-cap). |

iOS `DailySession` (`Models/DailySession.swift`) gains `var advice: String?`. Proxy `decryptSession` (`routes/sessions.ts`) decrypts and returns `advice`.

### New proxy day-task CRUD endpoints (`routes/sessions.ts`)

Manual day-task editing is enabled (user can add/edit/delete in addition to the coach creating them).

- `POST /sessions/:date/tasks` `{ title }` → append a `DayTask` (new uuid, `isCompleted:false`). Creates the session doc (with `weekId` resolved via `weekIdForDate`) if it does not exist. Returns the updated `DailySession`.
- `PUT /sessions/:date/tasks/:taskId` `{ title?, isCompleted? }` → rename and/or toggle; sets/clears `completedAt` when `isCompleted` changes. Returns updated session.
- `DELETE /sessions/:date/tasks/:taskId` → remove the task. Returns updated session.
- `PUT /sessions/:date/tasks/:taskId/complete` `{ isCompleted }` → **unchanged**, retained for the quick toggle path and the voice `complete_task` tool.

All endpoints encrypt the full `tasks` array on write (read-modify-write, mirroring the existing complete endpoint).

### Conversations day filter (`routes/conversations.ts`)

`GET /conversations` gains **optional** `from`/`to` query params filtering by `createdAt` (UTC ISO). When present, returns conversations with `from <= createdAt < to`. Backward compatible (no params → existing behavior: 50 most recent). Uses the existing `userId + createdAt` composite index. A day detail requests `from = <date>T00:00:00.000Z`, `to = <nextDate>T00:00:00.000Z`.

---

## 2. End-of-day scoring (proxy)

### `buildDayScorePrompt(ctx)` — `prompts.ts`

New builder producing a strict-JSON scoring prompt. Context:

- `profile` (for tone/personalization)
- `weekTasks` (the week's 3 tasks + completion)
- `dayTasks` (today's tasks + completion)
- `transcript` (evening call transcript)

Rubric in the prompt: score 0–10 based on **how much got done** and **how much effort was shown** today. The model returns ONLY:

```json
{
  "score": <integer 0-10>,
  "summary": "<2-4 sentence recap of how the day went, referencing actual tasks>",
  "advice": "<specific, personalized advice for tomorrow, in the coach's voice>"
}
```

### `scoreDay()` — `togetherAI.ts`

New function mirroring `generateRetrospective()`: `meta-llama/Llama-3.3-70B-Instruct-Turbo`, `temperature: 0.2`, JSON-parsed with safe fallback (`score` clamped to 0–10, defaulting to 5; `summary`/`advice` default to `''`). Returns `{ score, summary, advice }`.

### Evening webhook branch — `routes/webhooks.ts`

The `callType === 'evening'` branch:

1. Loads the day's session (to read its current `tasks`) and the current week's tasks for context.
2. Calls `scoreDay({ profile, weekTasks, dayTasks, transcript })` instead of `analyzeCall(transcript, 'evening', ...)`.
3. Writes to the session: `score`, encrypted `summary`, encrypted `advice` (drops `scoreRationale` write).
4. Tomorrow-skeleton creation and voice-usage metering are unchanged.
5. The conversation summary write (later in the handler) reuses the `summary` from the scoring result.

Score is computed exactly once, at the conclusion of the evening call — same timing as today.

---

## 3. iOS Tasks view redesign

The Tasks tab is already inside the shared `NavigationStack` in `MainTabView`, so day→call navigation uses `navigationDestination` like `CallsView`.

### `TasksView` — single selected-week screen

Top to bottom:

1. **Week selector** — a `Menu` dropdown listing **only created weeks** (newest first), labeled e.g. "Week 12 · Jun 2–8". Default selection = the week whose `[startDate, endDate]` range contains today; else the `active` week; else newest. Selection held in `@State`.
2. **Status pill** — Planning / In progress / Completed, derived from `week.status` (`planned`/`active`/`complete`).
3. **This week's 3 tasks** — checkable rows (unchanged toggle behavior via `WeekService.toggleWeekTask`).
4. **Retrospective** (collapsible) — shown when the selected week is `complete`: went well / improve / 1% better / summary, from `RetrospectiveService`.
5. **Weekday list** — Mon→Sun rows (calendar order; today in its natural position). Each row: weekday name, `MMM d`, done-count (`done/total` when tasks exist), score badge (when scored), TODAY marker. Tapping a row pushes **Day Detail**.

`WeekCardView` and `DayCardView` (the old expandable list) are retired; reusable pieces (`ScoreBadge`, `LCSectionLabel`, retrospective rendering, `orderedDays` logic) move into the new view / a shared helper.

### `DayDetailView` (new)

Pushed with the selected `DailySession` (or its date). Top to bottom:

1. **Tasks** — list of `DayTask` rows with done/not-done toggle; **+ Add task** field, inline rename, swipe-to-delete. Backed by the new session CRUD endpoints (optimistic update + reload). Empty state when none.
2. **Score + summary + advice** — the day's score (number + color), the day **summary**, and a "Coach's advice" block (`advice`). When the day is unscored: "Scored after your evening check-in."
3. **Calls** — that day's conversations (all types: midday, evening, weekly, free voice, **and** text chats), fetched via `GET /conversations?from&to`. Each row (icon, type label, time, message/duration subtitle) pushes the existing `ConversationDetailView` (transcript + recording playback already implemented).

Navigation: a small day-task service (or extend `SessionService`) loads a single day's session via `GET /sessions/:date` and performs CRUD; a call list is fetched via the conversations day filter. `ConversationDetailView` is reused as-is.

---

## 4. Home page

`HomeView` score card keeps the chosen hero layout:

- **Hero number** = the **last scored day's** score (most recent session with a non-nil `score`).
- **Secondary** = **week-so-far average** (average of non-nil scores in the current week) + day streak.

`HomeViewModel` computes `lastDayScore` and `weekAverage` from the loaded sessions (current week window). Existing streak/avg from `userStats` remains available; the card label changes from "Today's score / Avg score" to "Last day" with a "wk avg" secondary stat.

---

## 5. VAPI tools & prompts (`prompts.ts`)

- `set_day_tasks`: remove `minItems: 3` / `maxItems: 3`; update `description` to "Set the tasks for a specific day (any number)." The handler already overwrites the day's task list.
- Evening prompt (`buildEveningPrompt`): change "exactly 3 tasks for TOMORROW" wording to "the tasks for TOMORROW" (no fixed count). Confirm tomorrow's tasks aloud.
- `set_week_tasks` and the weekly prompt are unchanged (week stays exactly 3).

---

## 6. Tests

**Proxy (jest):**
- `webhooks.test.ts`: evening branch now calls `scoreDay` and persists `score` + encrypted `summary` + encrypted `advice`. Update mocks/assertions accordingly.
- `sessions` CRUD: add tests for POST/PUT/DELETE day-task endpoints (add, rename, toggle, delete, session-autocreate on POST).
- Conversations: `from`/`to` filtering returns the right day's calls.

**iOS:**
- `ModelTests.swift`: `DailySession` decodes the new `advice` field (and tolerates its absence).
- Light unit coverage of the week-selector default-selection logic (contains-today → active → newest).

---

## Risks / notes

- **Conversation→day mapping is by `createdAt` (UTC)**, consistent with how sessions/weeks use UTC date strings. A call near a UTC midnight boundary could land on the adjacent day; acceptable given the rest of the app is UTC-dated.
- **Single shared `NavigationStack`**: day-detail and call-detail destinations must use distinct `navigationDestination(item:)` types to avoid colliding with `CallsView`'s existing destinations.
- **Back-compat**: old sessions have no `advice` and may have `scoreRationale`; the day detail renders gracefully (advice optional, rationale ignored).
