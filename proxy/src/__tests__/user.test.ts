import request from 'supertest';
import { app } from '../index';

const VALID_TOKEN = 'valid-token';

beforeAll(() => {
  process.env.MASTER_ENCRYPTION_KEY = 'a'.repeat(64);
});

jest.mock('../services/firebase', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }),
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    batch: jest.fn(),
    ref: {},
  },
}));

jest.mock('../services/encryption', () => ({
  encrypt: jest.fn().mockImplementation((plaintext: string) =>
    Promise.resolve(`enc(${plaintext})`),
  ),
  decrypt: jest.fn().mockImplementation((ciphertext: string) =>
    Promise.resolve(ciphertext.replace(/^enc\(/, '').replace(/\)$/, '')),
  ),
  encryptJSON: jest.fn().mockImplementation((obj: unknown) =>
    Promise.resolve(`enc(${JSON.stringify(obj)})`),
  ),
  decryptJSON: jest.fn().mockImplementation((ciphertext: string) =>
    Promise.resolve(JSON.parse(ciphertext.replace(/^enc\(/, '').replace(/\)$/, ''))),
  ),
}));


const { db } = jest.requireMock('../services/firebase') as {
  db: {
    collection: jest.Mock;
    doc: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    batch: jest.Mock;
  };
};


function makeActions(
  completed: boolean[],
): Array<{ id: string; title: string; isCompleted: boolean; completedAt: string | null }> {
  return completed.map((c, i) => ({
    id: `a${i}`,
    title: `Action ${i}`,
    isCompleted: c,
    completedAt: c ? '2026-05-01T00:00:00.000Z' : null,
  }));
}

function encActions(completed: boolean[]): string {
  return `enc(${JSON.stringify(makeActions(completed))})`;
}

function makeBatch() {
  const ops: Array<{ type: string; ref: unknown }> = [];
  return {
    delete: jest.fn().mockImplementation((ref) => {
      ops.push({ type: 'delete', ref });
    }),
    commit: jest.fn().mockResolvedValue(undefined),
    _ops: ops,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  db.update.mockResolvedValue(undefined);
  db.delete.mockResolvedValue(undefined);
});

// ─── GET /user/profile ────────────────────────────────────────────────────────

describe('GET /user/profile', () => {
  it('returns decrypted profile when user exists', async () => {
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'enc(Alice)',
        createdAt: '2026-01-01T00:00:00.000Z',
        voiceSecondsUsedThisWeek: 120,
        weeklyVoiceQuotaSeconds: 3600,
        totalVoiceSecondsUsed: 500,
        totalChatMessages: 10,
        subscriptionStatus: 'premium',
        notificationSettings: `enc(${JSON.stringify({
          morningReminderHour: 8,
          morningReminderMinute: 0,
          eveningReminderHour: 21,
          eveningReminderMinute: 0,
          streakReminders: true,
        })})`,
      }),
    });

    const res = await request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Alice');
    expect(res.body.totalChatMessages).toBe(10);
    expect(res.body.voiceSecondsUsedThisWeek).toBe(120);
    expect(res.body.notificationSettings.morningReminderHour).toBe(8);
    expect(res.body.subscriptionStatus).toBe('premium');
  });

  it('backfills missing notificationSettings keys for users created before the fields existed', async () => {
    // A user created before the weeklyPlanning*/timeZone/middayReminder* fields existed
    // has a stored notificationSettings object holding only the old keys. The response
    // must still be COMPLETE — otherwise the iOS client (which decodes every key as
    // non-optional) fails to decode the entire profile ("The data couldn't be read").
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'enc(Carol)',
        createdAt: '2026-01-01T00:00:00.000Z',
        weeklyVoiceQuotaSeconds: 3600,
        notificationSettings: `enc(${JSON.stringify({
          eveningReminderHour: 21,
          eveningReminderMinute: 15,
          streakReminders: false,
        })})`,
      }),
    });

    const res = await request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    const ns = res.body.notificationSettings;
    // Stored values are preserved.
    expect(ns.eveningReminderHour).toBe(21);
    expect(ns.eveningReminderMinute).toBe(15);
    expect(ns.streakReminders).toBe(false);
    // Missing keys are backfilled with defaults — present and correctly typed.
    expect(typeof ns.middayReminderHour).toBe('number');
    expect(typeof ns.middayReminderMinute).toBe('number');
    expect(typeof ns.weeklyPlanningWeekday).toBe('number');
    expect(typeof ns.weeklyPlanningHour).toBe('number');
    expect(typeof ns.weeklyPlanningMinute).toBe('number');
    expect(typeof ns.timeZone).toBe('string');
  });

  it('defaults subscriptionStatus to "free" when the user has no grant', async () => {
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'enc(Bob)',
        createdAt: '2026-01-01T00:00:00.000Z',
        weeklyVoiceQuotaSeconds: 3600,
      }),
    });

    const res = await request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.subscriptionStatus).toBe('free');
  });

  it('returns 404 when user doc does not exist', async () => {
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns integer voice-second counts even when stored values are fractional', () => {
    // VAPI reports fractional call durations, so accumulated usage can be stored as e.g.
    // 377.57000000000005. The iOS client decodes voiceSecondsUsedThisWeek/totalVoiceSecondsUsed
    // as `Int`; a fractional JSON number fails the WHOLE profile decode with
    // "The data couldn't be read". The response must coerce these to whole seconds.
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        displayName: 'enc(Dave)',
        createdAt: '2026-01-01T00:00:00.000Z',
        voiceSecondsUsedThisWeek: 377.57000000000005,
        weeklyVoiceQuotaSeconds: 3600,
        totalVoiceSecondsUsed: 377.57000000000005,
        totalChatMessages: 0,
      }),
    });

    return request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(Number.isInteger(res.body.voiceSecondsUsedThisWeek)).toBe(true);
        expect(Number.isInteger(res.body.totalVoiceSecondsUsed)).toBe(true);
        expect(res.body.voiceSecondsUsedThisWeek).toBe(378);
        expect(res.body.totalVoiceSecondsUsed).toBe(378);
      });
  });
});

// ─── PUT /user/profile ────────────────────────────────────────────────────────

describe('PUT /user/profile', () => {
  it('encrypts displayName and updates Firestore', async () => {
    const res = await request(app)
      .put('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ displayName: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);
    expect(db.set).toHaveBeenCalledTimes(1);
    const setData = db.set.mock.calls[0][0] as { displayName: string };
    expect(setData.displayName).toBe('enc(Bob)');
  });

  it('stores fcmToken as plaintext', async () => {
    const res = await request(app)
      .put('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ fcmToken: 'token-abc' });

    expect(res.status).toBe(200);
    const setData = db.set.mock.calls[0][0] as { fcmToken: string };
    expect(setData.fcmToken).toBe('token-abc');
  });

  it('returns 400 when no valid fields provided', async () => {
    const res = await request(app)
      .put('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('accepts and round-trips new notification settings fields', async () => {
    const newSettings = {
      middayReminderHour: 11,
      middayReminderMinute: 30,
      eveningReminderHour: 20,
      eveningReminderMinute: 0,
      weeklyPlanningWeekday: 0,
      weeklyPlanningHour: 19,
      weeklyPlanningMinute: 0,
      timeZone: 'America/New_York',
      streakReminders: true,
    };
    const res = await request(app)
      .put('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ notificationSettings: newSettings });

    expect(res.status).toBe(200);
    expect(db.set).toHaveBeenCalledTimes(1);
    const setData = db.set.mock.calls[0][0] as { notificationSettings: string };
    expect(setData.notificationSettings).toContain('middayReminderHour');
    expect(setData.notificationSettings).toContain('weeklyPlanningWeekday');
    expect(setData.notificationSettings).toContain('timeZone');
  });
});

// ─── /user/goals ──────────────────────────────────────────────────────────────

describe('GET /user/goals', () => {
  it('returns the decrypted, normalized goals', async () => {
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        goals: `enc(${JSON.stringify([
          { id: 'g1', title: 'Run a marathon', description: 'sub-4h', dueDate: '2026-12-01' },
        ])})`,
      }),
    });

    const res = await request(app)
      .get('/user/goals')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.goals).toHaveLength(1);
    expect(res.body.goals[0].title).toBe('Run a marathon');
    expect(res.body.goals[0].dueDate).toBe('2026-12-01');
  });

  it('returns an empty array when the user has no goals', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });

    const res = await request(app)
      .get('/user/goals')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual([]);
  });
});

describe('PUT /user/goals', () => {
  it('drops empty-title rows, caps at 3, and persists the normalized set encrypted', async () => {
    const res = await request(app)
      .put('/user/goals')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        goals: [
          { title: '  Get healthy  ', description: 'gym 3x', dueDate: '2026-09-01' },
          { title: '', description: 'should be dropped', dueDate: '' },
          { title: 'Learn Spanish' },
          { title: 'Save money', dueDate: 'not-a-date' },
          { title: 'A fourth goal beyond the cap' },
        ],
      });

    expect(res.status).toBe(200);
    // 5 sent, 1 empty-title dropped, capped to 3.
    expect(res.body.goals).toHaveLength(3);
    expect(res.body.goals[0].title).toBe('Get healthy'); // trimmed
    expect(res.body.goals[0].id).toBeTruthy();           // id assigned
    expect(res.body.goals[1].title).toBe('Learn Spanish');
    expect(res.body.goals[1].description).toBe('');      // defaulted
    expect(res.body.goals[2].title).toBe('Save money');
    expect(res.body.goals[2].dueDate).toBe('');          // invalid date coerced

    expect(db.set).toHaveBeenCalledTimes(1);
    const [setData, opts] = db.set.mock.calls[0] as [{ goals: string }, unknown];
    expect(setData.goals).toContain('Get healthy');
    expect(opts).toEqual({ merge: true });
  });

  it('accepts an empty goals list (clears all goals)', async () => {
    const res = await request(app)
      .put('/user/goals')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ goals: [] });

    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual([]);
    expect(db.set).toHaveBeenCalledTimes(1);
  });
});

// ─── GET /user/stats — streak ─────────────────────────────────────────────────

describe('GET /user/stats — streak', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const twoDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  })();
  const threeDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  })();

  function makeSessionsSnapshot(
    entries: Array<{ date: string; completedFlags: boolean[]; score?: number }>,
  ) {
    return {
      docs: entries.map((e) => ({
        id: `user1_${e.date}`,
        data: () => ({
          userId: 'user1',
          date: e.date,
          microActions: encActions(e.completedFlags),
          score: e.score ?? null,
        }),
        ref: {},
      })),
    };
  }

  function makeUserSnapshot(overrides: Record<string, unknown> = {}) {
    return {
      exists: true,
      data: () => ({
        totalVoiceSecondsUsed: 0,
        totalChatMessages: 0,
        voiceMinutesUsedThisWeek: 0,
        weeklyVoiceQuotaSeconds: 3600,
        ...overrides,
      }),
    };
  }

  it('returns streak of 3 for 3 consecutive days with ≥1 completed action', async () => {
    db.get
      .mockResolvedValueOnce(
        makeSessionsSnapshot([
          { date: today, completedFlags: [true, false, false] },
          { date: yesterday, completedFlags: [true, true, false] },
          { date: twoDaysAgo, completedFlags: [false, false, true] },
        ]),
      )
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(3);
  });

  it('breaks streak on a missed day', async () => {
    // today and twoDaysAgo have completions, but yesterday does not
    db.get
      .mockResolvedValueOnce(
        makeSessionsSnapshot([
          { date: today, completedFlags: [true, true, true] },
          { date: yesterday, completedFlags: [false, false, false] },
          { date: twoDaysAgo, completedFlags: [true, false, false] },
          { date: threeDaysAgo, completedFlags: [true, true, false] },
        ]),
      )
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(1);
  });

  it('returns streak of 0 when today has no completed actions', async () => {
    db.get
      .mockResolvedValueOnce(
        makeSessionsSnapshot([
          { date: today, completedFlags: [false, false, false] },
          { date: yesterday, completedFlags: [true, true, true] },
        ]),
      )
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(0);
  });

  it('computes totalDaysComplete correctly', async () => {
    db.get
      .mockResolvedValueOnce(
        makeSessionsSnapshot([
          { date: today, completedFlags: [true, true, true] },
          { date: yesterday, completedFlags: [true, false, true] },
          { date: twoDaysAgo, completedFlags: [true, true, true] },
        ]),
      )
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.totalDaysComplete).toBe(2);
  });

  it('computes averageScore correctly', async () => {
    db.get
      .mockResolvedValueOnce(
        makeSessionsSnapshot([
          { date: today, completedFlags: [true], score: 8 },
          { date: yesterday, completedFlags: [true], score: 6 },
        ]),
      )
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.averageScore).toBe(7);
  });

  it('returns null averageScore when no sessions have a score', async () => {
    db.get
      .mockResolvedValueOnce(makeSessionsSnapshot([{ date: today, completedFlags: [true] }]))
      .mockResolvedValueOnce(makeUserSnapshot());

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.averageScore).toBeNull();
  });

  it('returns voiceMinutesRemainingThisWeek in MINUTES, not seconds', async () => {
    // 1200s used of a 3600s quota → 2400s remaining → 40 minutes
    db.get
      .mockResolvedValueOnce(makeSessionsSnapshot([]))
      .mockResolvedValueOnce(
        makeUserSnapshot({ voiceSecondsUsedThisWeek: 1200, weeklyVoiceQuotaSeconds: 3600 }),
      );

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.voiceMinutesRemainingThisWeek).toBe(40);
    expect(res.body.voiceSecondsUsedThisWeek).toBe(1200);
  });

  it('reports zero remaining (never negative) when over quota', async () => {
    db.get
      .mockResolvedValueOnce(makeSessionsSnapshot([]))
      .mockResolvedValueOnce(
        makeUserSnapshot({ voiceSecondsUsedThisWeek: 5000, weeklyVoiceQuotaSeconds: 3600 }),
      );

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.voiceMinutesRemainingThisWeek).toBe(0);
  });

  it('treats usage from a previous week as 0 (self-healing weekly reset)', async () => {
    db.get
      .mockResolvedValueOnce(makeSessionsSnapshot([]))
      .mockResolvedValueOnce(
        makeUserSnapshot({
          voiceSecondsUsedThisWeek: 3600,
          usageWeekId: 'user1_2026-W01', // stale stamp
          weeklyVoiceQuotaSeconds: 3600,
        }),
      );

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.voiceSecondsUsedThisWeek).toBe(0);
    expect(res.body.voiceMinutesRemainingThisWeek).toBe(60);
  });
});

// ─── DELETE /user ─────────────────────────────────────────────────────────────

describe('DELETE /user', () => {
  function makeSnapWithRefs(count: number) {
    return {
      docs: Array.from({ length: count }, (_, i) => ({ id: `doc${i}`, ref: { id: `doc${i}` } })),
    };
  }

  it('deletes all sessions, conversations, project, and user docs', async () => {
    const batchMock = makeBatch();
    db.batch.mockReturnValue(batchMock);

    // sessions query, conversations query
    db.get
      .mockResolvedValueOnce(makeSnapWithRefs(3))  // sessions
      .mockResolvedValueOnce(makeSnapWithRefs(2)); // conversations

    const res = await request(app)
      .delete('/user')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    // 3 sessions + 2 conversations + project doc + user doc = 7 deletes
    expect(batchMock.delete).toHaveBeenCalledTimes(7);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it('works correctly when user has no sessions or conversations', async () => {
    const batchMock = makeBatch();
    db.batch.mockReturnValue(batchMock);

    db.get
      .mockResolvedValueOnce(makeSnapWithRefs(0))
      .mockResolvedValueOnce(makeSnapWithRefs(0));

    const res = await request(app)
      .delete('/user')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    // project doc + user doc = 2 deletes
    expect(batchMock.delete).toHaveBeenCalledTimes(2);
  });
});
