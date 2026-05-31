# Weekly + Daily Tasks — Phase A (Proxy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the proxy from the single-project / daily-micro-action model to the weekly+daily task model with live VAPI tool calling, per the design at `docs/superpowers/specs/2026-05-31-weekly-daily-tasks-redesign-design.md`.

**Architecture:** New `weeks` collection + evolved `sessions` ("day") + new `retrospectives`. A new authenticated `/webhooks/vapi/tools` endpoint handles live tool calls (`set_week_tasks`, `set_day_tasks`, `complete_task`) writing encrypted JSON to Firebase. `/vapi/init-call` builds call context (week tasks + day tasks + history) and uses the already-created `src/prompts.ts`. The end-of-call webhook gains a `weekly` branch that marks the week complete and generates a retrospective via Together AI. New REST routes expose weeks/retrospectives to the app.

**Tech Stack:** Node/TypeScript, Express, firebase-admin (Firestore), Jest + supertest, Together AI. AES-256-GCM via `src/services/encryption.ts`.

**Conventions to follow (from existing code):**
- Every route file does `router.use(authMiddleware)` and reads `uid` from `(req as AuthedRequest).uid`.
- All user content is stored encrypted: arrays via `encryptJSON`/`decryptJSON<T>`, strings via `encrypt`/`decrypt`.
- Tests mock `../services/firebase` (chainable `db`) and `../services/encryption` (the `enc(...)` stub). Copy the mock blocks verbatim from `src/__tests__/sessions.test.ts`.
- Doc ids: `weeks/{uid}_{year}-W{ww}`, `sessions/{uid}_{YYYY-MM-DD}`, `retrospectives/{uid}_{year}-W{ww}`.

**Shared types (used across tasks — keep names identical):**
```ts
interface Task { id: string; title: string; isCompleted: boolean; completedAt: string | null; }
// WeekTask and DayTask are structurally identical to Task.
```

---

## Task 1: ISO-week helper module

**Files:**
- Create: `proxy/src/services/weeks.ts`
- Test: `proxy/src/__tests__/weeks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/weeks.test.ts
import { isoWeekParts, weekId, weekRange, upcomingWeekRange, weekIdForDate } from '../services/weeks';

describe('weeks helpers', () => {
  it('computes ISO week parts (Thursday rule)', () => {
    // 2026-01-01 is a Thursday -> ISO week 1 of 2026
    expect(isoWeekParts(new Date('2026-01-01T12:00:00Z'))).toEqual({ year: 2026, week: 1 });
    // 2026-06-01 is a Monday -> ISO week 23 of 2026
    expect(isoWeekParts(new Date('2026-06-01T12:00:00Z'))).toEqual({ year: 2026, week: 23 });
  });

  it('builds a weekId from uid + date', () => {
    expect(weekId('u1', new Date('2026-06-01T12:00:00Z'))).toBe('u1_2026-W23');
    expect(weekIdForDate('u1', '2026-06-03')).toBe('u1_2026-W23');
  });

  it('returns Monday..Sunday range for the week containing a date', () => {
    // Wednesday 2026-06-03
    expect(weekRange(new Date('2026-06-03T12:00:00Z'))).toEqual({
      year: 2026, week: 23, startDate: '2026-06-01', endDate: '2026-06-07',
    });
  });

  it('returns the next week for upcomingWeekRange (Sunday planning -> next Monday)', () => {
    // Sunday 2026-06-07 -> upcoming week starts Monday 2026-06-08
    expect(upcomingWeekRange(new Date('2026-06-07T19:00:00Z'))).toEqual({
      year: 2026, week: 24, startDate: '2026-06-08', endDate: '2026-06-14',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx jest weeks.test -i`
Expected: FAIL — `Cannot find module '../services/weeks'`.

- [ ] **Step 3: Write the implementation**

```ts
// proxy/src/services/weeks.ts
// All math is done in UTC against the date's calendar day.

export interface WeekParts { year: number; week: number; }
export interface WeekRange { year: number; week: number; startDate: string; endDate: string; }

function toUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO 8601 week number + week-year (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeekParts(date: Date): WeekParts {
  const d = toUTCDate(date);
  // Shift to the Thursday of this week so the year is the ISO week-year.
  const day = (d.getUTCDay() + 6) % 7; // 0=Mon .. 6=Sun
  d.setUTCDate(d.getUTCDate() - day + 3);
  const week = d;
  const firstThursday = new Date(Date.UTC(week.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const weekNo = 1 + Math.round((week.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: week.getUTCFullYear(), week: weekNo };
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

export function weekId(uid: string, date: Date): string {
  const { year, week } = isoWeekParts(date);
  return `${uid}_${year}-W${pad2(week)}`;
}

export function weekIdForDate(uid: string, isoDate: string): string {
  return weekId(uid, new Date(`${isoDate}T12:00:00Z`));
}

/** Monday..Sunday range for the week containing `date`. */
export function weekRange(date: Date): WeekRange {
  const d = toUTCDate(date);
  const day = (d.getUTCDay() + 6) % 7; // 0=Mon
  const monday = addDays(d, -day);
  const sunday = addDays(monday, 6);
  const { year, week } = isoWeekParts(monday);
  return { year, week, startDate: ymd(monday), endDate: ymd(sunday) };
}

/** The week immediately after the one containing `date`. */
export function upcomingWeekRange(date: Date): WeekRange {
  const current = weekRange(date);
  const nextMonday = addDays(new Date(`${current.startDate}T12:00:00Z`), 7);
  return weekRange(nextMonday);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd proxy && npx jest weeks.test -i`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add proxy/src/services/weeks.ts proxy/src/__tests__/weeks.test.ts
git commit -m "feat(proxy): ISO-week helpers for weekly task model"
```

---

## Task 2: Retrospective generation in togetherAI

**Files:**
- Modify: `proxy/src/services/togetherAI.ts` (add `generateRetrospective`; extend `analyzeCall` callType union)
- Test: `proxy/src/__tests__/togetherAI.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/togetherAI.test.ts
import { generateRetrospective } from '../services/togetherAI';

describe('generateRetrospective', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; process.env.TOGETHER_AI_API_KEY = ''; });

  it('parses the JSON report from the model', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        wentWell: 'Shipped the API.', improve: 'Start earlier.',
        onePercent: 'Plan the night before.', summary: 'Solid week overall.',
      }) } }] }),
    }) as unknown as typeof fetch;

    const r = await generateRetrospective('PROMPT TEXT');
    expect(r).toEqual({
      wentWell: 'Shipped the API.', improve: 'Start earlier.',
      onePercent: 'Plan the night before.', summary: 'Solid week overall.',
    });
  });

  it('falls back to safe defaults on unparseable output', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }) as unknown as typeof fetch;

    const r = await generateRetrospective('PROMPT TEXT');
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.wentWell).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx jest togetherAI.test -i`
Expected: FAIL — `generateRetrospective` is not exported.

- [ ] **Step 3: Implement**

In `proxy/src/services/togetherAI.ts`, change the `analyzeCall` signature union from `'morning' | 'evening' | 'free'` to `'midday' | 'evening' | 'free'` (rename `isMorning` to `isMidday` and its comparison to `'midday'`). Then append:

```ts
export interface RetrospectiveReport {
  wentWell: string;
  improve: string;
  onePercent: string;
  summary: string;
}

export async function generateRetrospective(prompt: string): Promise<RetrospectiveReport> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_AI_API_KEY is not set');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`Together AI request failed: ${response.status}`);

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
  try {
    const p = JSON.parse(raw) as Partial<RetrospectiveReport>;
    return {
      wentWell: p.wentWell ?? '',
      improve: p.improve ?? '',
      onePercent: p.onePercent ?? '',
      summary: p.summary ?? '',
    };
  } catch {
    return { wentWell: '', improve: '', onePercent: '', summary: raw.slice(0, 400) };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest togetherAI.test -i`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add proxy/src/services/togetherAI.ts proxy/src/__tests__/togetherAI.test.ts
git commit -m "feat(proxy): retrospective generation + rename morning->midday in analyzeCall"
```

---

## Task 3: `weeks` REST route (list + week-task completion)

**Files:**
- Create: `proxy/src/routes/weeks.ts`
- Modify: `proxy/src/index.ts` (register router)
- Test: `proxy/src/__tests__/weeks.route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/weeks.route.test.ts
import request from 'supertest';
import { app } from '../index';

jest.mock('../services/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }) },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../services/encryption', () => ({
  encrypt: jest.fn((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, ''))),
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));

const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

const weekTasks = [
  { id: 't1', title: 'Ship API', isCompleted: false, completedAt: null },
  { id: 't2', title: 'Write tests', isCompleted: false, completedAt: null },
  { id: 't3', title: 'Deploy', isCompleted: false, completedAt: null },
];
const weekDoc = (o: object = {}) => ({
  userId: 'user1', weekNumber: 23, year: 2026,
  startDate: '2026-06-01', endDate: '2026-06-07',
  tasks: `enc(${JSON.stringify(weekTasks)})`, status: 'active',
  retrospectiveId: null, createdAt: '2026-06-01T00:00:00Z', ...o,
});

describe('GET /weeks', () => {
  it('returns decrypted weeks', async () => {
    db.get.mockResolvedValueOnce({ docs: [{ id: 'user1_2026-W23', data: () => weekDoc() }] });
    const res = await request(app).get('/weeks').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body[0].weekNumber).toBe(23);
    expect(res.body[0].tasks).toHaveLength(3);
  });
});

describe('PUT /weeks/:weekKey/tasks/:taskId/complete', () => {
  it('toggles a week task', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-W23', data: () => weekDoc() });
    const res = await request(app)
      .put('/weeks/2026-W23/tasks/t1/complete')
      .set('Authorization', 'Bearer t')
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
    expect(res.body.tasks.find((t: { id: string }) => t.id === 't1').isCompleted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd proxy && npx jest weeks.route.test -i`
Expected: FAIL — route not registered (404).

- [ ] **Step 3: Implement the route**

```ts
// proxy/src/routes/weeks.ts
import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface Task { id: string; title: string; isCompleted: boolean; completedAt: string | null; }
interface WeekDoc {
  userId: string; weekNumber: number; year: number;
  startDate: string; endDate: string; tasks: string;
  status: string; retrospectiveId: string | null; createdAt: string;
}

async function decryptWeek(docId: string, data: WeekDoc) {
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return {
    id: docId, userId: data.userId, weekNumber: data.weekNumber, year: data.year,
    startDate: data.startDate, endDate: data.endDate, tasks,
    status: data.status, retrospectiveId: data.retrospectiveId ?? null, createdAt: data.createdAt,
  };
}

// GET /weeks  -> all weeks for the user, newest first
router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  try {
    const snapshot = await db
      .collection('weeks')
      .where('userId', '==', uid)
      .orderBy('startDate', 'desc')
      .get();
    const weeks = await Promise.all(
      snapshot.docs.map((d) => decryptWeek(d.id, d.data() as WeekDoc)),
    );
    res.json(weeks);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /weeks/:weekKey/tasks/:taskId/complete  (weekKey = "2026-W23")
router.put('/:weekKey/tasks/:taskId/complete', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { weekKey, taskId } = req.params;
  const { isCompleted } = req.body as { isCompleted?: boolean };
  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ error: 'isCompleted (boolean) is required' });
    return;
  }
  try {
    const docId = `${uid}_${weekKey}`;
    const ref = db.collection('weeks').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) { res.status(404).json({ error: 'Week not found' }); return; }
    const data = doc.data() as WeekDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }
    tasks[idx].isCompleted = isCompleted;
    tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
    const enc = await encryptJSON(tasks);
    await ref.update({ tasks: enc });
    res.json(await decryptWeek(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

In `proxy/src/index.ts` add the import and registration alongside the others:
```ts
import weeksRouter from './routes/weeks';
// ...
app.use('/weeks', weeksRouter);
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest weeks.route.test -i`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add proxy/src/routes/weeks.ts proxy/src/index.ts proxy/src/__tests__/weeks.route.test.ts
git commit -m "feat(proxy): /weeks route (list + week-task completion)"
```

---

## Task 4: `retrospectives` REST route

**Files:**
- Create: `proxy/src/routes/retrospectives.ts`
- Modify: `proxy/src/index.ts`
- Test: `proxy/src/__tests__/retrospectives.route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/retrospectives.route.test.ts
import request from 'supertest';
import { app } from '../index';

jest.mock('../services/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }) },
  db: { collection: jest.fn().mockReturnThis(), doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), get: jest.fn() },
}));
jest.mock('../services/encryption', () => ({
  encrypt: jest.fn((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, ''))),
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));
const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

const retroDoc = {
  userId: 'user1', weekId: 'user1_2026-W23', weekNumber: 23, year: 2026,
  startDate: '2026-06-01', endDate: '2026-06-07',
  wentWell: 'enc(Shipped)', improve: 'enc(Earlier)', onePercent: 'enc(Plan ahead)',
  summary: 'enc(Good week)', createdAt: '2026-06-07T19:30:00Z',
};

describe('GET /retrospectives', () => {
  it('returns decrypted retrospectives newest first', async () => {
    db.get.mockResolvedValueOnce({ docs: [{ id: 'user1_2026-W23', data: () => retroDoc }] });
    const res = await request(app).get('/retrospectives').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body[0].summary).toBe('Good week');
    expect(res.body[0].onePercent).toBe('Plan ahead');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest retrospectives.route.test -i`
Expected: FAIL (404, route missing).

- [ ] **Step 3: Implement**

```ts
// proxy/src/routes/retrospectives.ts
import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface RetroDoc {
  userId: string; weekId: string; weekNumber: number; year: number;
  startDate: string; endDate: string;
  wentWell: string; improve: string; onePercent: string; summary: string; createdAt: string;
}

async function decryptRetro(docId: string, d: RetroDoc) {
  return {
    id: docId, weekId: d.weekId, weekNumber: d.weekNumber, year: d.year,
    startDate: d.startDate, endDate: d.endDate,
    wentWell: d.wentWell ? await decrypt(d.wentWell) : '',
    improve: d.improve ? await decrypt(d.improve) : '',
    onePercent: d.onePercent ? await decrypt(d.onePercent) : '',
    summary: d.summary ? await decrypt(d.summary) : '',
    createdAt: d.createdAt,
  };
}

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  try {
    const snapshot = await db
      .collection('retrospectives')
      .where('userId', '==', uid)
      .orderBy('startDate', 'desc')
      .get();
    const retros = await Promise.all(
      snapshot.docs.map((d) => decryptRetro(d.id, d.data() as RetroDoc)),
    );
    res.json(retros);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

In `proxy/src/index.ts`:
```ts
import retrospectivesRouter from './routes/retrospectives';
// ...
app.use('/retrospectives', retrospectivesRouter);
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest retrospectives.route.test -i`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/routes/retrospectives.ts proxy/src/index.ts proxy/src/__tests__/retrospectives.route.test.ts
git commit -m "feat(proxy): /retrospectives route"
```

---

## Task 5: Evolve `sessions` route to the "day" model

Rename `microActions`→`tasks`, `morningCallId`→`middayCallId`, add `weekId`, drop `tomorrowMicroActions`. Change the completion endpoint path to `/:date/tasks/:taskId/complete`.

**Files:**
- Modify: `proxy/src/routes/sessions.ts`
- Modify: `proxy/src/__tests__/sessions.test.ts`

- [ ] **Step 1: Update the test fixtures and expectations**

In `sessions.test.ts`: rename `sampleActions`→`sampleTasks`; in `sessionDocData` replace `microActions` key with `tasks`, replace `morningCallId` with `middayCallId`, add `weekId: 'user1_2026-W21'`, remove `tomorrowMicroActions`. Update all assertions from `res.body[0].microActions` to `res.body[0].tasks`. Update the completion test to:

```ts
describe('PUT /sessions/:date/tasks/:taskId/complete', () => {
  it('marks a task complete', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-05-19', data: () => sessionDocData() });
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.tasks.find((t: { id: string }) => t.id === 'action1').isCompleted).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest sessions.test -i`
Expected: FAIL (old field names / old path).

- [ ] **Step 3: Implement the rename in `sessions.ts`**

Replace the `MicroAction`/`SessionDoc` interfaces and helpers so the file uses `tasks`, `middayCallId`, `weekId`, and drops `tomorrowMicroActions`:

```ts
interface Task { id: string; title: string; isCompleted: boolean; completedAt?: string | null; }

interface SessionDoc {
  userId: string;
  date: string;
  tasks: string;
  weekId?: string | null;
  middayCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
}

function emptySession(userId: string, date: string) {
  return {
    id: `${userId}_${date}`, userId, date, tasks: [], weekId: null,
    middayCallId: null, eveningCallId: null, score: null, scoreRationale: null,
  };
}

async function decryptSession(docId: string, data: SessionDoc) {
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  const scoreRationale = data.scoreRationale ? await decrypt(data.scoreRationale) : null;
  return {
    id: docId, userId: data.userId, date: data.date, tasks,
    weekId: data.weekId ?? null,
    middayCallId: data.middayCallId ?? null,
    eveningCallId: data.eveningCallId ?? null,
    score: data.score ?? null, scoreRationale,
  };
}
```

Update both GET handlers to call `decryptSession(doc.id, doc.data() as SessionDoc)` (drop the unused `uid` arg). Replace the completion handler signature/body to use `tasks` and the new path:

```ts
router.put('/:date/tasks/:taskId/complete', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date, taskId } = req.params;
  const { isCompleted } = req.body as { isCompleted?: boolean };
  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ error: 'isCompleted (boolean) is required' });
    return;
  }
  try {
    const docId = `${uid}_${date}`;
    const doc = await db.collection('sessions').doc(docId).get();
    if (!doc.exists) { res.status(404).json({ error: 'Session not found' }); return; }
    const data = doc.data() as SessionDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }
    tasks[idx].isCompleted = isCompleted;
    tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
    const enc = await encryptJSON(tasks);
    await db.collection('sessions').doc(docId).update({ tasks: enc });
    res.json(await decryptSession(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest sessions.test -i`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/routes/sessions.ts proxy/src/__tests__/sessions.test.ts
git commit -m "refactor(proxy): sessions route uses day task model (tasks/middayCallId/weekId)"
```

---

## Task 6: Rewrite `/vapi/init-call` for the new call types + prompts

Replace the inline prompt builders in `routes/vapi.ts` with imports from `src/prompts.ts`, support `callType` ∈ `midday|evening|weekly|free`, and assemble week + day context.

**Files:**
- Modify: `proxy/src/routes/vapi.ts`
- Modify: `proxy/src/__tests__/vapi.test.ts`

- [ ] **Step 1: Write/adjust the failing test**

Rewrite `vapi.test.ts` to mock firebase + encryption (same blocks as Task 3) and assert the new behavior. Key cases:

```ts
it('rejects an invalid callType', async () => {
  const res = await request(app).post('/vapi/init-call')
    .set('Authorization', 'Bearer t').send({ callType: 'bogus' });
  expect(res.status).toBe(400);
});

it('returns systemPrompt + metadata for a midday call', async () => {
  // users doc (profile)
  db.get
    .mockResolvedValueOnce({ exists: true, data: () => ({ displayName: 'enc(Ada)', coachingStyle: 'enc(balanced)' }) }) // user profile
    .mockResolvedValueOnce({ docs: [] })           // current week query
    .mockResolvedValueOnce({ exists: false })      // today's session
    .mockResolvedValueOnce({ docs: [] });          // last 7 sessions
  const res = await request(app).post('/vapi/init-call')
    .set('Authorization', 'Bearer t').send({ callType: 'midday' });
  expect(res.status).toBe(200);
  expect(res.body.metadata.callType).toBe('midday');
  expect(typeof res.body.systemPrompt).toBe('string');
  expect(res.body.conversationId).toBeTruthy();
});
```

Set `process.env.VAPI_ASSISTANT_ID = 'asst_test'` at the top of the test file.

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest vapi.test -i`
Expected: FAIL (project lookup / old callType validation).

- [ ] **Step 3: Implement**

Rewrite `routes/vapi.ts`. Remove the project lookup and the inline `buildMorning/Evening/Free` functions and `buildPersona/styleGuidance` (now in `prompts.ts`). New shape:

```ts
import * as crypto from 'crypto';
import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decrypt, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { weekId as computeWeekId, weekRange, weekIdForDate } from '../services/weeks';
import {
  buildMiddayPrompt, buildEveningPrompt, buildWeeklyPrompt, buildFreePrompt,
  UserProfile, CoachingStyle, PromptTask, CallPromptContext,
} from '../prompts';

const router = Router();
router.use(authMiddleware);

type CallType = 'midday' | 'evening' | 'weekly' | 'free';

interface Task { id: string; title: string; isCompleted: boolean; completedAt?: string | null; }
interface SessionDoc { date: string; tasks?: string; score?: number | null; }
interface WeekDoc { weekNumber: number; startDate: string; endDate: string; tasks?: string; }
interface UserProfileDoc {
  displayName?: string; bio?: string; coachingStyle?: string; occupation?: string; motivation?: string;
}

const CALL_TYPE_TO_CONVERSATION_TYPE: Record<CallType, string> = {
  midday: 'middayCall', evening: 'eveningCall', weekly: 'weeklyCall', free: 'freeVoice',
};

function todayDateString(): string { return new Date().toISOString().slice(0, 10); }
function daysAgoDateString(n: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10);
}

async function getUserProfile(uid: string): Promise<UserProfile> {
  const doc = await db.collection('users').doc(uid).get();
  const data = doc.exists ? (doc.data() as UserProfileDoc) : {};
  const styleRaw = data.coachingStyle ? await decrypt(data.coachingStyle) : 'balanced';
  const coachingStyle: CoachingStyle =
    styleRaw === 'tough' || styleRaw === 'gentle' ? styleRaw : 'balanced';
  return {
    name: data.displayName ? await decrypt(data.displayName) : '',
    bio: data.bio ? await decrypt(data.bio) : '',
    coachingStyle,
    occupation: data.occupation ? await decrypt(data.occupation) : '',
    motivation: data.motivation ? await decrypt(data.motivation) : '',
  };
}

function toPromptTasks(tasks: Task[]): PromptTask[] {
  return tasks.map((t) => ({ id: t.id, title: t.title, isCompleted: t.isCompleted }));
}

async function getCurrentWeek(uid: string) {
  const id = computeWeekId(uid, new Date());
  const doc = await db.collection('weeks').doc(id).get();
  const range = weekRange(new Date());
  if (!doc.exists) {
    return { weekNumber: range.week, startDate: range.startDate, endDate: range.endDate, tasks: [] as PromptTask[] };
  }
  const data = doc.data() as WeekDoc;
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return {
    weekNumber: data.weekNumber ?? range.week,
    startDate: data.startDate ?? range.startDate,
    endDate: data.endDate ?? range.endDate,
    tasks: toPromptTasks(tasks),
  };
}

async function getTodayTasks(uid: string): Promise<PromptTask[]> {
  const doc = await db.collection('sessions').doc(`${uid}_${todayDateString()}`).get();
  if (!doc.exists) return [];
  const data = doc.data() as SessionDoc;
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return toPromptTasks(tasks);
}

async function getRecentHistory(uid: string): Promise<string> {
  const from = daysAgoDateString(6);
  const to = todayDateString();
  const snap = await db.collection('sessions')
    .where('userId', '==', uid).where('date', '>=', from).where('date', '<=', to).get();
  const rows = await Promise.all(snap.docs.map(async (d) => {
    const data = d.data() as SessionDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const done = tasks.filter((t) => t.isCompleted).length;
    const score = data.score != null ? ` (score: ${data.score}/10)` : '';
    return `${data.date}: ${done}/${tasks.length} tasks completed${score}`;
  }));
  if (rows.length === 0) return 'No recent history.';
  return rows.sort((a, b) => b.localeCompare(a)).join('\n');
}

router.post('/init-call', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { callType } = req.body as { callType?: string };
  if (!callType || !['midday', 'evening', 'weekly', 'free'].includes(callType)) {
    res.status(400).json({ error: 'callType must be "midday", "evening", "weekly", or "free"' });
    return;
  }
  const type = callType as CallType;
  try {
    const [profile, week, todayTasks, recentHistory] = await Promise.all([
      getUserProfile(uid), getCurrentWeek(uid), getTodayTasks(uid), getRecentHistory(uid),
    ]);
    const ctx: CallPromptContext = {
      profile,
      weekTasks: week.tasks, weekNumber: week.weekNumber,
      weekStartDate: week.startDate, weekEndDate: week.endDate,
      todayTasks, recentHistory,
    };
    let systemPrompt: string;
    if (type === 'midday') systemPrompt = buildMiddayPrompt(ctx);
    else if (type === 'evening') systemPrompt = buildEveningPrompt(ctx);
    else if (type === 'weekly') systemPrompt = buildWeeklyPrompt(ctx);
    else systemPrompt = buildFreePrompt(ctx);

    const assistantId = process.env.VAPI_ASSISTANT_ID ?? '';
    if (!assistantId) { res.status(500).json({ error: 'VAPI_ASSISTANT_ID is not configured' }); return; }

    const conversationId = crypto.randomUUID();
    await db.collection('conversations').doc(conversationId).set({
      userId: uid, type: CALL_TYPE_TO_CONVERSATION_TYPE[type],
      messages: await encryptJSON([]), vapiCallId: null, durationSeconds: null,
      createdAt: new Date().toISOString(), summary: await encrypt(''),
    });

    res.json({
      conversationId, assistantId, systemPrompt,
      metadata: { userId: uid, callType: type, conversationId },
    });
  } catch (err) {
    console.error('vapi init-call error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

> Note `weekIdForDate` is imported for symmetry with later tasks; if the linter flags it as unused, remove it from this file's imports.

- [ ] **Step 4: Run tests**

Run: `cd proxy && npx jest vapi.test -i`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/routes/vapi.ts proxy/src/__tests__/vapi.test.ts
git commit -m "feat(proxy): init-call builds week+day context, uses prompts.ts and new call types"
```

---

## Task 7: VAPI tool webhook `/webhooks/vapi/tools`

Handles live `tool-calls` (`set_week_tasks`, `set_day_tasks`, `complete_task`).

**Files:**
- Create: `proxy/src/services/vapiTools.ts` (dispatch logic — unit-testable without HTTP)
- Modify: `proxy/src/routes/webhooks.ts` (add the route)
- Test: `proxy/src/__tests__/vapiTools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// proxy/src/__tests__/vapiTools.test.ts
import { handleToolCall } from '../services/vapiTools';

jest.mock('../services/firebase', () => ({
  db: { collection: jest.fn().mockReturnThis(), doc: jest.fn().mockReturnThis(),
    get: jest.fn(), set: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/encryption', () => ({
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));
const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

describe('handleToolCall', () => {
  beforeEach(() => jest.clearAllMocks());

  it('set_day_tasks writes 3 tasks for the date and links weekId', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_day_tasks',
      { date: '2026-06-02', tasks: ['A', 'B', 'C'] });
    expect(db.set).toHaveBeenCalled();
    expect(r).toMatch(/3 tasks/i);
  });

  it('set_week_tasks writes the upcoming week', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_week_tasks', { tasks: ['X', 'Y', 'Z'] });
    expect(db.set).toHaveBeenCalled();
    expect(r).toMatch(/week/i);
  });

  it('complete_task toggles a matching day task', async () => {
    const tasks = [{ id: 't1', title: 'A', isCompleted: false, completedAt: null }];
    // first get: today's session contains the task
    db.get
      .mockResolvedValueOnce({ exists: true, ref: { update: db.update },
        data: () => ({ date: '2026-06-02', tasks: `enc(${JSON.stringify(tasks)})` }) });
    const r = await handleToolCall('user1', 'complete_task', { taskId: 't1', isCompleted: true });
    expect(r).toMatch(/marked/i);
  });

  it('returns an error string for an unknown tool', async () => {
    const r = await handleToolCall('user1', 'nope', {});
    expect(r).toMatch(/unknown/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest vapiTools.test -i`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the dispatcher**

`complete_task` needs to find the task across the current week and recent day sessions. Implementation strategy: search the current week doc, then today's and the last 7 days' session docs, by task id.

```ts
// proxy/src/services/vapiTools.ts
import * as crypto from 'crypto';
import { db } from './firebase';
import { encryptJSON, decryptJSON } from './encryption';
import { weekId, weekRange, upcomingWeekRange, weekIdForDate } from './weeks';

interface Task { id: string; title: string; isCompleted: boolean; completedAt: string | null; }

function makeTasks(titles: string[]): Task[] {
  return titles.slice(0, 3).map((title) => ({
    id: crypto.randomUUID(), title, isCompleted: false, completedAt: null,
  }));
}

async function setWeekTasks(uid: string, titles: string[]): Promise<string> {
  const range = upcomingWeekRange(new Date());
  const id = `${uid}_${range.year}-W${String(range.week).padStart(2, '0')}`;
  await db.collection('weeks').doc(id).set({
    userId: uid, weekNumber: range.week, year: range.year,
    startDate: range.startDate, endDate: range.endDate,
    tasks: await encryptJSON(makeTasks(titles)), status: 'planned',
    retrospectiveId: null, createdAt: new Date().toISOString(),
  });
  return `Saved 3 tasks for week ${range.week} (starting ${range.startDate}).`;
}

async function setDayTasks(uid: string, date: string, titles: string[]): Promise<string> {
  const id = `${uid}_${date}`;
  const ref = db.collection('sessions').doc(id);
  const existing = await ref.get();
  const base = existing.exists ? (existing.data() as Record<string, unknown>) : {};
  await ref.set({
    ...base,
    userId: uid, date,
    tasks: await encryptJSON(makeTasks(titles)),
    weekId: weekIdForDate(uid, date),
    middayCallId: (base as { middayCallId?: string }).middayCallId ?? null,
    eveningCallId: (base as { eveningCallId?: string }).eveningCallId ?? null,
    score: (base as { score?: number }).score ?? null,
    scoreRationale: (base as { scoreRationale?: string }).scoreRationale ?? null,
  });
  return `Saved 3 tasks for ${date}.`;
}

async function toggleInDoc(
  ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>,
  taskId: string, isCompleted: boolean,
): Promise<boolean> {
  const enc = data.tasks as string | undefined;
  if (!enc) return false;
  const tasks = await decryptJSON<Task[]>(enc);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;
  tasks[idx].isCompleted = isCompleted;
  tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
  await ref.update({ tasks: await encryptJSON(tasks) });
  return true;
}

async function completeTask(uid: string, taskId: string, isCompleted: boolean): Promise<string> {
  // 1. current week
  const weekRef = db.collection('weeks').doc(weekId(uid, new Date()));
  const weekDoc = await weekRef.get();
  if (weekDoc.exists && await toggleInDoc(weekRef as never, weekDoc.data() as Record<string, unknown>, taskId, isCompleted)) {
    return `Marked the week task ${isCompleted ? 'complete' : 'not complete'}.`;
  }
  // 2. last 7 day sessions
  const from = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 6); return d.toISOString().slice(0, 10); })();
  const to = new Date().toISOString().slice(0, 10);
  const snap = await db.collection('sessions')
    .where('userId', '==', uid).where('date', '>=', from).where('date', '<=', to).get();
  for (const d of snap.docs) {
    if (await toggleInDoc(d.ref as never, d.data() as Record<string, unknown>, taskId, isCompleted)) {
      return `Marked the task ${isCompleted ? 'complete' : 'not complete'}.`;
    }
  }
  return 'Could not find that task.';
}

export async function handleToolCall(
  uid: string, name: string, args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'set_week_tasks':
      return setWeekTasks(uid, (args.tasks as string[]) ?? []);
    case 'set_day_tasks':
      return setDayTasks(uid, String(args.date ?? new Date().toISOString().slice(0, 10)), (args.tasks as string[]) ?? []);
    case 'complete_task':
      return completeTask(uid, String(args.taskId ?? ''), Boolean(args.isCompleted));
    default:
      return `Unknown tool: ${name}`;
  }
}
```

> The `complete_task` test mocks a single `get` returning the week ref; adjust the test's mock sequence so the first `db.get` (week) returns `{ exists: false }` and the sessions query returns the doc, OR keep the week doc as the match. Ensure the test's mock `.ref.update` is wired (use `db.update`). If `FirebaseFirestore` namespace types are unavailable in the test build, the `as never` casts keep it compiling; verify with `npx tsc --noEmit`.

- [ ] **Step 4: Add the HTTP route in `webhooks.ts`**

At the top add `import { handleToolCall } from '../services/vapiTools';`. Add this route (the `verifyVapiSecret` helper already exists):

```ts
interface VapiToolCallsBody {
  message: {
    type: string;
    toolCallList?: Array<{ id: string; name?: string; function?: { name: string; arguments: unknown }; arguments?: unknown }>;
    call?: { metadata?: { userId?: string } };
  };
}

router.post('/vapi/tools', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const body = req.body as VapiToolCallsBody;
  const message = body?.message;
  if (!message || message.type !== 'tool-calls') { res.json({ received: true }); return; }
  const uid = message.call?.metadata?.userId;
  if (!uid) { res.status(400).json({ error: 'Missing userId in call metadata' }); return; }

  const calls = message.toolCallList ?? [];
  const results = await Promise.all(calls.map(async (c) => {
    const name = c.function?.name ?? c.name ?? '';
    const rawArgs = c.function?.arguments ?? c.arguments ?? {};
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    let result: string;
    try { result = await handleToolCall(uid, name, args as Record<string, unknown>); }
    catch (e) { console.error('tool call error', e); result = 'There was an error saving that.'; }
    return { toolCallId: c.id, result };
  }));
  res.json({ results });
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `cd proxy && npx jest vapiTools.test -i && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add proxy/src/services/vapiTools.ts proxy/src/routes/webhooks.ts proxy/src/__tests__/vapiTools.test.ts
git commit -m "feat(proxy): live VAPI tool webhook (set_week_tasks/set_day_tasks/complete_task)"
```

---

## Task 8: Evolve the end-of-call webhook for the new call types

Add the `weekly` branch (mark week complete + generate retrospective), update `evening` (score + tomorrow skeleton with new field names), `midday` (transcript only), and the `analyzeCall` callType mapping (`morning`→`midday`).

**Files:**
- Modify: `proxy/src/routes/webhooks.ts`
- Modify: `proxy/src/__tests__/webhooks.test.ts`

- [ ] **Step 1: Update/extend the test**

In `webhooks.test.ts`, mock `../services/togetherAI` to also export `generateRetrospective`, and mock `../prompts` `buildRetrospectivePrompt`. Add a weekly-call case:

```ts
it('weekly call marks the week complete and writes a retrospective', async () => {
  // sequence the db.get calls used by the weekly branch (see implementation):
  // 1) today's session (for analyzeCall context fetch if any) 2) current week doc
  db.get.mockResolvedValue({ exists: true, data: () => ({
    weekNumber: 23, year: 2026, startDate: '2026-06-01', endDate: '2026-06-07',
    tasks: `enc(${JSON.stringify([{ id: 't1', title: 'A', isCompleted: true, completedAt: null }])})`,
  }) });
  const res = await request(app).post('/webhooks/vapi')
    .set('x-vapi-secret', 'test-secret')
    .send({ message: { type: 'end-of-call-report',
      call: { id: 'c1', metadata: { userId: 'user1', callType: 'weekly', conversationId: 'conv1' } },
      transcript: 'we reviewed the week', durationSeconds: 600 } });
  expect(res.status).toBe(200);
  // retrospectives doc written + week status update
  expect(db.set).toHaveBeenCalled();
});
```

Set `process.env.VAPI_WEBHOOK_SECRET = 'test-secret'` in the test. Update any existing `callType: 'morning'` cases to `'midday'`.

- [ ] **Step 2: Run to verify it fails**

Run: `cd proxy && npx jest webhooks.test -i`
Expected: FAIL (no weekly branch / old field names).

- [ ] **Step 3: Implement**

In `webhooks.ts`:
1. Remove the project-title lookup block (no projects). Pass a generic context string to `analyzeCall` instead, e.g. `''` for project title, OR change `analyzeCall` callers to drop it — keep signature stable by passing `'your goals'`.
2. Update `SessionDoc` interface: `tasks?: string`, `middayCallId?`, `weekId?`; drop `microActions`/`tomorrowMicroActions`/`morningCallId`.
3. `callType` union: `'midday' | 'evening' | 'weekly' | 'free'`.
4. `midday` branch: just persist the conversation (transcript/summary handled by the shared block at the end). No session writes (tasks were written live).
5. `evening` branch: keep score logic but use `tasks` field name and `middayCallId`; tomorrow skeleton uses `tasks: await encryptJSON([])`, `weekId: weekIdForDate(userId, tomorrow)`, `middayCallId: null`.
6. New `weekly` branch:

```ts
} else if (callType === 'weekly') {
  const { weekId, weekRange } = await import('../services/weeks');
  const { generateRetrospective } = await import('../services/togetherAI');
  const { buildRetrospectivePrompt } = await import('../prompts');

  const range = weekRange(new Date());
  const weekDocId = weekId(userId, new Date());
  const weekRef = db.collection('weeks').doc(weekDocId);
  const weekSnap = await weekRef.get();

  let weekTasks: Array<{ id: string; title: string; isCompleted: boolean }> = [];
  if (weekSnap.exists) {
    const wd = weekSnap.data() as { tasks?: string };
    if (wd.tasks) weekTasks = await decryptJSON(wd.tasks);
    await weekRef.update({ status: 'complete' });
  }

  const profile = { name: '', bio: '', coachingStyle: 'balanced' as const, occupation: '', motivation: '' };
  const prompt = buildRetrospectivePrompt({
    profile, weekNumber: range.week, weekStartDate: range.startDate, weekEndDate: range.endDate,
    weekTasks: weekTasks.map((t) => ({ id: t.id, title: t.title, isCompleted: t.isCompleted })),
    dailyBreakdown: 'See conversations.', conversationDigest: transcript,
  });
  const report = await generateRetrospective(prompt);

  const retroId = `${userId}_${range.year}-W${String(range.week).padStart(2, '0')}`;
  await db.collection('retrospectives').doc(retroId).set({
    userId, weekId: weekDocId, weekNumber: range.week, year: range.year,
    startDate: range.startDate, endDate: range.endDate,
    wentWell: await encrypt(report.wentWell), improve: await encrypt(report.improve),
    onePercent: await encrypt(report.onePercent), summary: await encrypt(report.summary),
    createdAt: new Date().toISOString(),
  });
  if (weekSnap.exists) await weekRef.update({ retrospectiveId: retroId });
}
```

> Use top-of-file imports instead of dynamic `await import` if you prefer; dynamic import is shown to keep the diff localized. Either is fine — be consistent with the rest of the file (which uses top-level imports), so prefer adding `weekId, weekRange, weekIdForDate` to the existing import section and `generateRetrospective` to the togetherAI import and `buildRetrospectivePrompt` to a new `../prompts` import.

- [ ] **Step 4: Run tests + typecheck**

Run: `cd proxy && npx jest webhooks.test -i && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy/src/routes/webhooks.ts proxy/src/__tests__/webhooks.test.ts
git commit -m "feat(proxy): weekly retrospective generation + midday/evening webhook updates"
```

---

## Task 9: Remove the Projects feature from the proxy

**Files:**
- Delete: `proxy/src/routes/project.ts`, `proxy/src/__tests__/project.test.ts`
- Modify: `proxy/src/index.ts`

- [ ] **Step 1: Delete the files and unregister the route**

```bash
git rm proxy/src/routes/project.ts proxy/src/__tests__/project.test.ts
```
In `proxy/src/index.ts` remove `import projectRouter from './routes/project';` and `app.use('/project', projectRouter);`.

- [ ] **Step 2: Verify nothing else imports project**

Run: `cd proxy && grep -rn "routes/project\|/project'" src | grep -v __tests__`
Expected: no output.

- [ ] **Step 3: Typecheck + full test run**

Run: `cd proxy && npx tsc --noEmit && npm test`
Expected: all suites PASS (no project suite remains).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(proxy): remove projects feature"
```

---

## Task 10: Expand user notification settings (timezone + weekly + midday)

**Files:**
- Modify: `proxy/src/routes/user.ts`
- Modify: `proxy/src/__tests__/user.test.ts`

- [ ] **Step 1: Inspect current settings handling**

Run: `cd proxy && grep -n "notificationSettings\|morningReminder\|eveningReminder" src/routes/user.ts`
Confirm which fields the route currently reads/writes.

- [ ] **Step 2: Update the test**

Add/replace assertions so a PUT/PATCH of `notificationSettings` accepts and round-trips: `middayReminderHour`, `middayReminderMinute`, `eveningReminderHour`, `eveningReminderMinute`, `weeklyPlanningWeekday`, `weeklyPlanningHour`, `weeklyPlanningMinute`, `timeZone`, `streakReminders`. (Mirror the existing test's shape; mock blocks identical to Task 3.)

- [ ] **Step 3: Run to verify it fails**

Run: `cd proxy && npx jest user.test -i`
Expected: FAIL on new fields.

- [ ] **Step 4: Implement**

In `user.ts`, wherever `notificationSettings` is parsed/stored, replace `morningReminderHour/Minute` with `middayReminderHour/Minute` and add `weeklyPlanningWeekday`, `weeklyPlanningHour`, `weeklyPlanningMinute`, and `timeZone` (string). Keep `eveningReminder*` and `streakReminders`. Apply sensible defaults (midday 11:30, evening 20:00, weekly Sunday=0 19:00, timeZone `'UTC'`) where the route constructs defaults.

- [ ] **Step 5: Run tests + typecheck**

Run: `cd proxy && npx jest user.test -i && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add proxy/src/routes/user.ts proxy/src/__tests__/user.test.ts
git commit -m "feat(proxy): timezone + midday/weekly notification settings"
```

---

## Task 11: One-off VAPI tool registration script

Registers the three tools on the VAPI assistant via the API (`TOOL_DEFINITIONS` from `prompts.ts`).

**Files:**
- Create: `proxy/scripts/registerVapiTools.ts`

- [ ] **Step 1: Implement the script**

```ts
// proxy/scripts/registerVapiTools.ts
// Run: cd proxy && npx ts-node scripts/registerVapiTools.ts
// Requires VAPI_PRIVATE_API_KEY, VAPI_ASSISTANT_ID, VAPI_WEBHOOK_SECRET, and the
// public tools URL (defaults to https://api.soularc.xyz/webhooks/vapi/tools).
import 'dotenv/config';
import { TOOL_DEFINITIONS } from '../src/prompts';

const API = 'https://api.vapi.ai';
const key = process.env.VAPI_PRIVATE_API_KEY!;
const assistantId = process.env.VAPI_ASSISTANT_ID!;
const serverUrl = process.env.VAPI_TOOLS_URL ?? 'https://api.soularc.xyz/webhooks/vapi/tools';
const secret = process.env.VAPI_WEBHOOK_SECRET!;

async function main() {
  const toolIds: string[] = [];
  for (const def of TOOL_DEFINITIONS) {
    const resp = await fetch(`${API}/tool`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'function',
        function: def.function,
        server: { url: serverUrl, secret },
      }),
    });
    if (!resp.ok) throw new Error(`Create tool ${def.function.name} failed: ${resp.status} ${await resp.text()}`);
    const created = (await resp.json()) as { id: string };
    console.log(`Created ${def.function.name} -> ${created.id}`);
    toolIds.push(created.id);
  }

  const patch = await fetch(`${API}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: { toolIds } }),
  });
  if (!patch.ok) throw new Error(`Attach tools failed: ${patch.status} ${await patch.text()}`);
  console.log('Attached toolIds to assistant:', toolIds);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Typecheck**

Run: `cd proxy && npx tsc --noEmit`
Expected: no errors. (Do not run the script in CI — it mutates the live VAPI assistant. Run manually once during deploy, and document `VAPI_PRIVATE_API_KEY` / `VAPI_TOOLS_URL` in `.env.example`.)

- [ ] **Step 3: Document env keys**

Add `VAPI_PRIVATE_API_KEY=` and `VAPI_TOOLS_URL=https://api.soularc.xyz/webhooks/vapi/tools` to `proxy/.env.example`.

- [ ] **Step 4: Commit**

```bash
git add proxy/scripts/registerVapiTools.ts proxy/.env.example
git commit -m "chore(proxy): VAPI tool registration script + env docs"
```

---

## Task 12: Firestore indexes + full green run

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add composite indexes**

Add indexes for the new ordered queries:
- `weeks`: `userId` ASC + `startDate` DESC
- `retrospectives`: `userId` ASC + `startDate` DESC

Edit `firestore.indexes.json` to include these alongside the existing `sessions`/`conversations` indexes (match the existing JSON shape in that file).

- [ ] **Step 2: Deploy indexes (manual, documented)**

Run (when ready): `firebase deploy --only firestore:indexes`
Expected: indexes created (prod service account cannot self-create at query time — see memory `firestore-indexes`).

- [ ] **Step 3: Full proxy verification**

Run: `cd proxy && npx tsc --noEmit && npm test`
Expected: typecheck clean; all jest suites PASS.

- [ ] **Step 4: Commit**

```bash
git add firestore.indexes.json
git commit -m "chore: firestore indexes for weeks + retrospectives"
```

---

## Self-review notes (coverage map spec → tasks)

- Weekly/daily data model → Tasks 1, 3, 4, 5.
- VAPI live tools (set_week_tasks/set_day_tasks/complete_task) → Task 7 (+ registration Task 11).
- init-call context + prompts.ts wiring → Task 6 (prompts.ts already created in the design step).
- Retrospective generation at end of weekly call → Tasks 2, 8.
- Call-type evolution (midday/evening/weekly/free) → Tasks 6, 8.
- Remove projects → Task 9.
- Configurable times + timezone (data side) → Task 10. (The scheduler that *uses* these is Phase C — separate plan.)
- Indexes → Task 12.

## Out of scope for this plan (separate plans)
- **Phase B — iOS:** models (`Week`/`WeekTask`/`DayTask`/`Retrospective`), Tasks tab + week cards, dashboard, settings, retrospectives in Profile, removal of Projects/goal, call-type wiring.
- **Phase C — Scheduler:** timezone-aware per-user reminders consuming the Task 10 settings.
- **Phase D — Landing + design prompts:** copy + mocks for the new model.
