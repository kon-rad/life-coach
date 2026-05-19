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

jest.mock('../services/keyStore', () => ({
  deleteUserKey: jest.fn().mockResolvedValue(undefined),
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

const { deleteUserKey } = jest.requireMock('../services/keyStore') as {
  deleteUserKey: jest.Mock;
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
        voiceMinutesUsedThisWeek: 120,
        weeklyVoiceQuotaSeconds: 3600,
        totalVoiceSecondsUsed: 500,
        totalChatMessages: 10,
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
    expect(res.body.voiceMinutesUsedThisWeek).toBe(120);
    expect(res.body.notificationSettings.morningReminderHour).toBe(8);
  });

  it('returns 404 when user doc does not exist', async () => {
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .get('/user/profile')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
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

  it('computes voiceMinutesRemainingThisWeek correctly', async () => {
    db.get
      .mockResolvedValueOnce(makeSessionsSnapshot([]))
      .mockResolvedValueOnce(
        makeUserSnapshot({ voiceMinutesUsedThisWeek: 1200, weeklyVoiceQuotaSeconds: 3600 }),
      );

    const res = await request(app)
      .get('/user/stats')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.voiceMinutesRemainingThisWeek).toBe(2400);
  });
});

// ─── DELETE /user ─────────────────────────────────────────────────────────────

describe('DELETE /user', () => {
  function makeSnapWithRefs(count: number) {
    return {
      docs: Array.from({ length: count }, (_, i) => ({ id: `doc${i}`, ref: { id: `doc${i}` } })),
    };
  }

  it('deletes all sessions, conversations, project, and user docs, then calls deleteUserKey', async () => {
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
    expect(deleteUserKey).toHaveBeenCalledWith('user1');
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
    expect(deleteUserKey).toHaveBeenCalledWith('user1');
  });
});
