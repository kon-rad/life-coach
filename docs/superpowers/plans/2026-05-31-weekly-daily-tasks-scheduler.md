# Weekly + Daily Tasks — Phase C (Scheduler) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global 8am/9pm bulk push with a timezone-aware per-user scheduler that pushes each user at their configured **midday check-in**, **evening debrief**, and **weekly planning** local times.

**Architecture:** A pure function `usersDueAt(users, now)` decides who is due for which reminder given the current instant, evaluating each user's `notificationSettings` against their `timeZone`. A node-cron tick (every 5 minutes) loads users, calls the pure function, and sends the matching push. The pure function is unit-tested; the cron wiring is thin.

**Tech Stack:** node-cron, firebase-admin (FCM via `sendPushNotification`), Jest. Timezone math via `Intl.DateTimeFormat` (no new deps).

**Prereqs:** Phase A merged (`users.notificationSettings` now has midday/evening/weekly fields + `timeZone`).

---

## Task 1: `usersDueAt` pure function

**Files:**
- Create: `proxy/src/services/reminders.ts`
- Test: `proxy/src/__tests__/reminders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/reminders.test.ts
import { localHourMinuteWeekday, usersDueAt, ReminderUser } from '../services/reminders';

describe('localHourMinuteWeekday', () => {
  it('converts an instant to local h/m/weekday for a timezone', () => {
    // 2026-06-01T15:30:00Z = 11:30 in America/New_York (EDT, UTC-4), Monday (weekday 1)
    const r = localHourMinuteWeekday(new Date('2026-06-01T15:30:00Z'), 'America/New_York');
    expect(r).toEqual({ hour: 11, minute: 30, weekday: 1 });
  });
});

describe('usersDueAt', () => {
  const base: ReminderUser = {
    uid: 'u1', fcmToken: 'tok',
    settings: {
      middayReminderHour: 11, middayReminderMinute: 30,
      eveningReminderHour: 20, eveningReminderMinute: 0,
      weeklyPlanningWeekday: 0, weeklyPlanningHour: 19, weeklyPlanningMinute: 0,
      timeZone: 'America/New_York', streakReminders: true,
    },
  };

  it('returns a midday reminder when local time matches within the tick window', () => {
    // 15:30 UTC -> 11:30 EDT == midday slot
    const due = usersDueAt([base], new Date('2026-06-01T15:30:00Z'), 5);
    expect(due).toEqual([{ uid: 'u1', fcmToken: 'tok', kind: 'midday' }]);
  });

  it('returns a weekly reminder on the configured weekday/time', () => {
    // Sunday 2026-06-07, 19:00 EDT = 23:00 UTC, weekday 0
    const due = usersDueAt([base], new Date('2026-06-07T23:00:00Z'), 5);
    expect(due).toEqual([{ uid: 'u1', fcmToken: 'tok', kind: 'weekly' }]);
  });

  it('returns nothing outside any slot', () => {
    expect(usersDueAt([base], new Date('2026-06-01T18:00:00Z'), 5)).toEqual([]);
  });

  it('skips users without an fcm token', () => {
    const noTok = { ...base, fcmToken: '' };
    expect(usersDueAt([noTok], new Date('2026-06-01T15:30:00Z'), 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest reminders.test -i`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// proxy/src/services/reminders.ts

export interface ReminderSettings {
  middayReminderHour: number; middayReminderMinute: number;
  eveningReminderHour: number; eveningReminderMinute: number;
  weeklyPlanningWeekday: number; weeklyPlanningHour: number; weeklyPlanningMinute: number;
  timeZone: string; streakReminders: boolean;
}
export interface ReminderUser { uid: string; fcmToken: string; settings: ReminderSettings; }
export type ReminderKind = 'midday' | 'evening' | 'weekly';
export interface DueReminder { uid: string; fcmToken: string; kind: ReminderKind; }

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

export function localHourMinuteWeekday(now: Date, timeZone: string): { hour: number; minute: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some envs emit 24 for midnight
  return { hour, minute: parseInt(get('minute'), 10), weekday: WEEKDAY_INDEX[get('weekday')] ?? 0 };
}

/** Minutes-of-day distance; true when target is within [now, now+windowMinutes). */
function withinWindow(curH: number, curM: number, tH: number, tM: number, windowMinutes: number): boolean {
  const cur = curH * 60 + curM;
  const tgt = tH * 60 + tM;
  return tgt >= cur && tgt < cur + windowMinutes;
}

export function usersDueAt(users: ReminderUser[], now: Date, windowMinutes: number): DueReminder[] {
  const out: DueReminder[] = [];
  for (const u of users) {
    if (!u.fcmToken) continue;
    const s = u.settings;
    if (!s || !s.timeZone) continue;
    const { hour, minute, weekday } = localHourMinuteWeekday(now, s.timeZone);
    if (withinWindow(hour, minute, s.middayReminderHour, s.middayReminderMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'midday' });
    } else if (withinWindow(hour, minute, s.eveningReminderHour, s.eveningReminderMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'evening' });
    } else if (weekday === s.weeklyPlanningWeekday &&
               withinWindow(hour, minute, s.weeklyPlanningHour, s.weeklyPlanningMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'weekly' });
    }
  }
  return out;
}

export const REMINDER_COPY: Record<ReminderKind, { title: string; body: string }> = {
  midday: { title: 'Midday check-in ☀️', body: 'Quick check-in: how are today\'s 3 tasks going?' },
  evening: { title: 'Evening debrief 🌙', body: 'Review today and plan tomorrow with your coach.' },
  weekly: { title: 'Weekly planning 📅', body: 'Retro the week and set your 3 tasks for next week.' },
};
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest reminders.test -i`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add proxy/src/services/reminders.ts proxy/src/__tests__/reminders.test.ts
git commit -m "feat(proxy): timezone-aware reminder scheduling (pure fn)"
```

---

## Task 2: Wire the scheduler to per-user reminders

**Files:**
- Modify: `proxy/src/services/scheduler.ts`
- Test: `proxy/src/__tests__/scheduler.test.ts`

- [ ] **Step 1: Write the failing test for the dispatch helper**

```ts
// proxy/src/__tests__/scheduler.test.ts
import { runReminderTick } from '../services/scheduler';

jest.mock('../services/firebase', () => ({
  db: { collection: jest.fn().mockReturnThis(), get: jest.fn() },
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}));
const fb = jest.requireMock('../services/firebase') as {
  db: { collection: jest.Mock; get: jest.Mock };
  sendPushNotification: jest.Mock;
};

describe('runReminderTick', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a push to users due at the given instant', async () => {
    fb.db.get.mockResolvedValueOnce({ docs: [{
      id: 'u1',
      data: () => ({
        fcmToken: 'tok',
        notificationSettings: {
          middayReminderHour: 11, middayReminderMinute: 30,
          eveningReminderHour: 20, eveningReminderMinute: 0,
          weeklyPlanningWeekday: 0, weeklyPlanningHour: 19, weeklyPlanningMinute: 0,
          timeZone: 'America/New_York', streakReminders: true,
        },
      }),
    }] });

    await runReminderTick(new Date('2026-06-01T15:30:00Z'));
    expect(fb.sendPushNotification).toHaveBeenCalledTimes(1);
    expect(fb.sendPushNotification).toHaveBeenCalledWith('tok', expect.stringContaining('Midday'), expect.any(String));
  });

  it('sends nothing when no user is due', async () => {
    fb.db.get.mockResolvedValueOnce({ docs: [] });
    await runReminderTick(new Date('2026-06-01T18:00:00Z'));
    expect(fb.sendPushNotification).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest scheduler.test -i`
Expected: FAIL — `runReminderTick` not exported.

- [ ] **Step 3: Rewrite `scheduler.ts`**

```ts
import * as cron from 'node-cron';
import { db, sendPushNotification } from './firebase';
import { usersDueAt, REMINDER_COPY, ReminderUser, ReminderSettings } from './reminders';

const TICK_WINDOW_MINUTES = 5;

interface UserDoc {
  fcmToken?: string;
  notificationSettings?: ReminderSettings;
}

async function loadReminderUsers(): Promise<ReminderUser[]> {
  const snap = await db.collection('users').get();
  const users: ReminderUser[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as UserDoc;
    if (!data.fcmToken || !data.notificationSettings) continue;
    users.push({ uid: doc.id, fcmToken: data.fcmToken, settings: data.notificationSettings });
  }
  return users;
}

export async function runReminderTick(now: Date = new Date()): Promise<void> {
  try {
    const users = await loadReminderUsers();
    const due = usersDueAt(users, now, TICK_WINDOW_MINUTES);
    await Promise.all(
      due.map((d) => {
        const copy = REMINDER_COPY[d.kind];
        return sendPushNotification(d.fcmToken, copy.title, copy.body).catch(() => {});
      }),
    );
  } catch {
    // never crash the server from the scheduler
  }
}

export function startScheduler(): void {
  // Every 5 minutes; TICK_WINDOW_MINUTES must match the cron cadence.
  cron.schedule('*/5 * * * *', () => { void runReminderTick(); });
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `cd proxy && npx jest scheduler.test -i && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Full proxy test run**

Run: `cd proxy && npm test`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add proxy/src/services/scheduler.ts proxy/src/__tests__/scheduler.test.ts
git commit -m "feat(proxy): per-user timezone-aware reminder scheduler"
```

---

## Self-review notes (spec → tasks)

- Timezone-aware per-user reminders → Task 1 (logic) + Task 2 (wiring).
- Midday/evening/weekly slots → covered in `usersDueAt`.
- Single PM2 fork instance constraint unchanged (one cron, idempotent within the 5-min window).

## Notes
- The 5-minute tick window means a reminder fires once when local time enters `[slot, slot+5min)`. Keep `TICK_WINDOW_MINUTES` equal to the cron cadence to avoid double/zero sends.
- Streak reminders (`streakReminders`) are out of scope here; they remain handled client-side as today.
