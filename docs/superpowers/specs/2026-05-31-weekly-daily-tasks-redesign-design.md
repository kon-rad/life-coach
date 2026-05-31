# Soularc — Weekly + Daily Tasks Redesign

**Date:** 2026-05-31
**Status:** Approved design, pre-implementation
**Supersedes:** the "single active project + daily micro-actions" model

---

## 1. Why this change

The current app centers on a single **Project** and 3 daily **micro-actions** extracted
from morning/evening calls. We are replacing that with a **sprint-style operating model**:
the coach runs your week the way a high-performing team runs a sprint, through three
recurring meetings.

There is **no overarching "goal" or "project" entity anymore.** The top of the hierarchy is
the **weekly 3 tasks**. Daily 3 tasks ladder up to the weekly tasks.

### The three meetings

| Meeting | Default time (configurable) | Purpose | Tasks written |
|---|---|---|---|
| **Weekly planning + retrospective** | Sunday 19:00 local | Retro the ending week, then set the **3 tasks for next week** | 3 week tasks |
| **Midday check-in** | Late morning, daily | Progress, roadblocks/questions, confirm you're on today's 3 tasks | mark progress |
| **Evening debrief** | Evening, daily | What got done today → plan **tomorrow's 3 tasks** | 3 day tasks (tomorrow) |
| Free / ad-hoc voice call | anytime | Open conversation with the coach | — |

**Hierarchy:** `Week (3 tasks)` → `Day (3 tasks)`. Daily tasks are the concrete path to the
week's tasks.

### Week boundary

Weeks are **ISO 8601 (Monday–Sunday)**. The Sunday-evening weekly call retrospects the
**ending** week (Mon–Sun just completing) and plans the **next** week (the Monday that
starts the following day). The agent receives the current date/time via VAPI's built-in
`{{now}}`/`{{date}}` variables, so it can reason about which week is ending and which is
starting.

---

## 2. Data model (Firebase; all user content AES-256-GCM encrypted by the proxy)

### Removed

- `projects` collection and `Project` model.
- iOS Project views (`ProjectView`, `ProjectViewModel`, `EditProjectView`).
- The onboarding "goal" capture step (`GoalInputView`'s goal → project flow).
- Proxy `routes/project.ts` and its tests.

### `weeks/{uid}_{ISOyearWeek}`

Doc id example: `abc123_2026-W23`.

| Field | Type | Notes |
|---|---|---|
| `userId` | string | |
| `weekNumber` | number | ISO week number (1–53) |
| `year` | number | ISO week-year |
| `startDate` | string | ISO date of Monday |
| `endDate` | string | ISO date of Sunday |
| `tasks` | string (enc JSON) | array of exactly 3 `WeekTask` `{ id, title, isCompleted, completedAt }` |
| `status` | string | `planned` \| `active` \| `complete` |
| `retrospectiveId` | string \| null | set when retro generated |
| `createdAt` | string | ISO timestamp |

### `sessions/{uid}_{date}` (kept — preserves the existing composite index; conceptually "the day")

Evolved from the current micro-action session doc.

| Field | Type | Change |
|---|---|---|
| `userId` | string | — |
| `date` | string | ISO `YYYY-MM-DD` |
| `tasks` | string (enc JSON) | **renamed** from `microActions`; array of up to 3 `DayTask` `{ id, title, isCompleted, completedAt }` |
| `weekId` | string | **new** — link to the owning `weeks` doc |
| `middayCallId` | string \| null | **renamed** from `morningCallId` |
| `eveningCallId` | string \| null | — |
| `score` | number \| null | daily effort 0–10, set in evening debrief |
| `scoreRationale` | string (enc) \| null | — |

> `tomorrowMicroActions` is removed — tomorrow's tasks are written directly to tomorrow's
> `sessions` doc via the `set_day_tasks` tool during the evening call.

### `retrospectives/{uid}_{ISOyearWeek}`

| Field | Type | Notes |
|---|---|---|
| `userId` | string | |
| `weekId` | string | |
| `weekNumber`, `year`, `startDate`, `endDate` | | for display without joining |
| `wentWell` | string (enc) | what went well |
| `improve` | string (enc) | what to improve |
| `onePercent` | string (enc) | the one thing to be 1% better next week |
| `summary` | string (enc) | full narrative report |
| `createdAt` | string | |

Generated automatically by the end-of-call webhook after the **weekly** call.

### `conversations`

`type` enum gains `weeklyCall`; `morningCall` → `middayCall`. Existing
`eveningCall`/`freeChat`/`freeVoice` unchanged.

### `users.notificationSettings`

| Field | Default | Notes |
|---|---|---|
| `middayReminderHour` / `middayReminderMinute` | 11:30 | renamed from morning |
| `eveningReminderHour` / `eveningReminderMinute` | 20:00 | — |
| `weeklyPlanningWeekday` | 0 (Sunday) | 0=Sun … 6=Sat |
| `weeklyPlanningHour` / `weeklyPlanningMinute` | 19:00 | — |
| `timeZone` | device IANA tz | **new** — required for per-user scheduling |
| `streakReminders` | true | — |

---

## 3. Call types

Proxy `CallType` becomes `'midday' | 'evening' | 'weekly' | 'free'`.

`CALL_TYPE_TO_CONVERSATION_TYPE`:
`midday → middayCall`, `evening → eveningCall`, `weekly → weeklyCall`, `free → freeVoice`.

---

## 4. VAPI live tool calling

One shared VAPI assistant. **Three custom tools**, registered once via the VAPI API
(`POST https://api.vapi.ai/tool`) and attached to the assistant via `toolIds`. All point at
a new endpoint:

```
POST https://api.soularc.xyz/webhooks/vapi/tools
```

### Tool webhook contract

- VAPI POSTs a `tool-calls` message containing `message.toolCallList[]`, each item:
  `{ id, name, arguments }`.
- Auth: verify `x-vapi-secret` header (`VAPI_WEBHOOK_SECRET`).
- The user is resolved from `message.call.metadata.userId` (the same metadata already set in
  `/vapi/init-call`).
- The handler dispatches by `name`, writes encrypted to Firebase, and responds **synchronously**:

```json
{ "results": [ { "toolCallId": "<id>", "result": "Saved 3 tasks for week 23." } ] }
```

The `result` string is spoken/used by the agent to confirm aloud.

### The tools

| Tool | Arguments | Behavior |
|---|---|---|
| `set_week_tasks` | `{ tasks: [string, string, string] }` | Compute the **upcoming** ISO week from current date, create/overwrite its `weeks` doc with 3 `WeekTask`s (`status: planned`). Used in the **weekly** call. |
| `set_day_tasks` | `{ date: "YYYY-MM-DD", tasks: [string, string, string] }` | Create/overwrite that day's `sessions.tasks` with 3 `DayTask`s, auto-link `weekId` for the date. Midday → today; evening → tomorrow. |
| `complete_task` | `{ taskId: string, isCompleted: boolean }` | Toggle a week or day task by id. IDs are injected into the prompt so the agent can reference them. |

> YAGNI: no separate `update_task`/edit-title tool for v1 — re-running `set_*` overwrites.

### Passing data into the call

`/vapi/init-call` keeps the current pattern: build the full `systemPrompt` server-side and
return it; the iOS Vapi SDK starts the call with `assistantOverrides` (system prompt +
metadata). The prompt now includes:

- user profile (name, occupation, motivation, coaching style),
- the **current week's** 3 tasks with their `id`s and done state,
- recent day tasks + scores (last 7 days),
- for evening/weekly: explicit instruction + the ids needed for `complete_task`.

Built-in `{{now}}` / `{{date}}` are referenced so the agent knows the date/time and can
compute today / tomorrow / which week is ending vs. starting.

### End-of-call webhook (`/webhooks/vapi`, `end-of-call-report`) by call type

| Call type | Webhook actions |
|---|---|
| `midday` | Save transcript + conversation summary. (Tasks/progress already written live.) |
| `evening` | Save transcript; compute & save daily **0–10 score** via Together AI; ensure tomorrow's `sessions` skeleton exists. (Tomorrow's tasks written live by `set_day_tasks`.) |
| `weekly` | Save transcript; mark the ending `weeks` doc `status: complete`; **auto-generate the retrospective** (Together AI over the week's conversations + tasks + scores) and write `retrospectives` + back-link `retrospectiveId`. (Next week's tasks written live by `set_week_tasks`.) |
| `free` | Save transcript + summary only. |

---

## 5. System prompts — single source

New file **`proxy/src/prompts.ts`** is the one place all coach prompts live. It exports:

- `buildMiddayPrompt(ctx)`
- `buildEveningPrompt(ctx)`
- `buildWeeklyPrompt(ctx)`
- `buildFreePrompt(ctx)`
- `buildRetrospectivePrompt(ctx)` — used by the weekly webhook to generate the report
- `TOOL_DEFINITIONS` — the JSON-schema definitions used to register the VAPI tools
- shared helpers (`buildPersona`, `styleGuidance`) moved here from `vapi.ts`

`routes/vapi.ts` and the weekly webhook import from this module instead of defining prompts
inline. Each call prompt explicitly instructs which tool(s) to call and when.

---

## 6. iOS app changes

- **Delete** Projects feature folder + `Project` model; remove goal onboarding step.
- **Rename "Projects" tab → "Tasks"** (`TasksView`): a vertical list of **week cards**.
  - Current week card is **expanded and pinned to the top**: header `Week X` + start–end
    dates, 3 week-task checkboxes, then a list of the week's days (today expanded & pinned
    top) each showing its 3 day-task checkboxes with toggles.
  - Past weeks appear as collapsed cards below.
- **Dashboard (`HomeView`):** current week's 3 tasks + today's 3 tasks + today's score +
  next scheduled meeting.
- **Calls:** offer midday / evening / weekly / free; `VoiceCallView` passes the `callType`.
- **Profile → "Weekly Retrospective Reports":** list of all reports → detail view
  (went well / improve / 1% better / narrative).
- **Settings:** configure midday time, evening time, weekly planning weekday + time, and
  timezone.
- **New models:** `Week`, `WeekTask`, `DayTask` (replaces `MicroAction`), `Retrospective`;
  updated `NotificationSettings`.
- Checkbox toggles call proxy endpoints that re-encrypt and persist the task arrays
  (week-task and day-task completion), parity with what `complete_task` does.

---

## 7. Scheduler

Replace the global 8am/9pm bulk cron with a **timezone-aware tick** (every ~5 minutes) that,
for each user, evaluates their local time against their configured midday / evening /
weekly-planning slots and sends the matching push. Requires `users.notificationSettings.timeZone`.
Still a single PM2 fork instance (one scheduler).

---

## 8. Landing + design prompts

- **Landing (`landing/`):** rewrite `Hero`, `HowItWorks`, `Showcase`, `WhoItsFor` copy and
  the phone mock to the "weekly planning + 2 daily standups + automatic retrospectives"
  model. Remove project/goal framing.
- **Design prompts (`design/design-prompt.md`):** update to reflect Tasks tab (week cards),
  retrospective reports, and the new meeting cadence; rename Projects → Tasks throughout.

---

## 9. Implementation sequencing (for the follow-up plan)

This design spans four surfaces. The implementation plan will sequence it as:

- **A. Proxy:** data model (weeks / sessions evolution / retrospectives), `prompts.ts`,
  `set_week_tasks` / `set_day_tasks` / `complete_task` tools + `/webhooks/vapi/tools`
  endpoint, evolved `/vapi/init-call`, retrospective generation in the weekly webhook,
  task-completion REST endpoints, VAPI tool registration, tests.
- **B. iOS:** models, Tasks tab + week cards, dashboard, call types, retrospectives in
  Profile, settings, removal of Projects/goal.
- **C. Scheduler:** timezone-aware per-user reminders.
- **D. Landing + design prompts:** copy + mocks.

---

## 10. Out of scope (v1)

- Editing an individual task's title via a dedicated tool (overwrite via `set_*` instead).
- More than 3 tasks per week/day.
- Migrating existing `projects`/`microActions` production data (clean cutover assumed).
- Multi-goal or multi-week-ahead planning.
