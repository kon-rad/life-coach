# Collapsible Weekly Review + Coach Edits to Past Days (auto-rescore)

Date: 2026-06-06
Status: Approved

## Feature 1 — Collapsible Weekly Review (iOS)

In `TasksView.swift`, the `retrospectiveCard` becomes collapsible:

- `@State private var isReviewExpanded = false` — collapsed by default.
- Card header is a tappable row: "Weekly review" label + rotating chevron, wrapped in a
  `Button` with `withAnimation`.
- Collapsed: only the header row shows inside the `LCCard`. Expanded: existing content
  (summary, "Went well", "To improve", "One percent") renders below.
- No `DisclosureGroup` — a custom header keeps the existing `LCCard` design language.

No data/model changes.

## Feature 2 — Coach edits past days + auto-rescore (proxy)

The coach can already physically write to past days (`set_day_tasks` takes any date;
`complete_task` searches the last 7 days). The gaps are prompt knowledge and rescoring.

### 2a. Prompt knowledge (`prompts.ts`)

- Tool descriptions: `set_day_tasks` gains "may target any date within the last 7 days to
  correct a past day"; `complete_task` gains "works on tasks from the past 7 days too".
- Call prompts (midday/evening/free/weekly) gain one line: if the user says they actually
  completed (or missed) something on a previous day, update that day with `complete_task`
  or `set_day_tasks` — its score is recalculated automatically after the call.

### 2b. Track which past days were edited (`vapiTools.ts` + `/vapi/tools` route)

- `handleToolCall` returns `{ result: string, touchedDate?: string }` — `touchedDate` set
  when `set_day_tasks` or `complete_task` modifies a **session** doc (week-task toggles
  don't set it).
- The `/vapi/tools` route collects distinct touched dates **before today** and merges them
  onto the conversation doc as plain `editedPastDates: string[]` (via `arrayUnion`).
  Dates are metadata, like the already-plaintext `score` — no encryption needed.

### 2c. Rescore at end of call (`webhooks.ts` + `prompts.ts` + `togetherAI.ts`)

- After the per-call-type handling in the end-of-call webhook (all call types), read
  `editedPastDates` from the conversation doc. For each date:
  - Load that date's session; **only rescore if it already has a score** (a never-scored
    day stays unscored — scoring is the evening call's job).
  - Load the week tasks for **that date's** ISO week (not the current week).
  - `buildRescorePrompt({ weekTasks, dayTasks })` → Together AI returns strict JSON
    `{ "score": 0-10 }`. **Summary and advice are left untouched.**
  - Update only `score` on the session doc.
- Best-effort: rescore failures are logged, never fail the webhook.

### Decisions made

- Rescore = score only (summary/advice kept) — chosen over full re-analysis.
- Edit scope = last 7 days (matches `complete_task` search window).
- Rescore timing = end of call (one LLM call per edited day, regardless of edit count).
- Future dates (tomorrow's tasks) never trigger rescore.
- Today's edits during an evening call are covered by the evening scoring in the same
  webhook (it reads current task state, which already includes the edits).
- A completed week's retrospective is NOT regenerated when a day inside it is rescored.
- iOS needs no changes for feature 2 — the app reads `score` from session docs.
