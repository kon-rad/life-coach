import request from 'supertest';
import { app } from '../index';
import { weekId } from '../services/weeks';

process.env.VAPI_ASSISTANT_ID = 'asst_test';

jest.mock('../services/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }) },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/encryption', () => ({
  encrypt: jest.fn((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, ''))),
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));

const { db } = jest.requireMock('../services/firebase') as {
  db: Record<string, jest.Mock>;
};

beforeEach(() => {
  jest.clearAllMocks();
  // mockReset specifically on db.get so its mockResolvedValueOnce queue is emptied
  // between tests (clearAllMocks does NOT clear the Once queue, which would leak
  // leftover resolved values into later tests).
  db.get.mockReset();
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  db.update.mockResolvedValue(undefined);
});

describe('POST /vapi/init-call', () => {
  it('rejects an invalid callType', async () => {
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing callType', async () => {
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(400);
  });

  it('returns systemPrompt + metadata for a midday call', async () => {
    db.get
      .mockResolvedValueOnce({ exists: true, data: () => ({ weeklyVoiceQuotaSeconds: 3900, voiceSecondsUsedThisWeek: 0 }) }) // quota gate
      .mockResolvedValueOnce({ exists: true, data: () => ({ displayName: 'enc(Ada)', coachingStyle: 'enc(balanced)' }) }) // user profile
      .mockResolvedValueOnce({ exists: false })      // current week doc
      .mockResolvedValueOnce({ exists: false })      // today's session
      .mockResolvedValueOnce({ docs: [] });          // last 7 sessions
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(200);
    expect(res.body.metadata.callType).toBe('midday');
    expect(typeof res.body.systemPrompt).toBe('string');
    expect(res.body.conversationId).toBeTruthy();
    expect(res.body.assistantId).toBe('asst_test');
  });

  it('returns systemPrompt + metadata for an evening call', async () => {
    db.get
      .mockResolvedValueOnce({ exists: true, data: () => ({ weeklyVoiceQuotaSeconds: 3900, voiceSecondsUsedThisWeek: 0 }) }) // quota gate
      .mockResolvedValueOnce({ exists: true, data: () => ({ displayName: 'enc(Bob)', coachingStyle: 'enc(tough)' }) })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ docs: [] });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'evening' });
    expect(res.status).toBe(200);
    expect(res.body.metadata.callType).toBe('evening');
    expect(typeof res.body.systemPrompt).toBe('string');
  });

  it('creates a conversation doc in Firestore', async () => {
    db.get
      .mockResolvedValueOnce({ exists: false })      // quota gate (no doc → default quota, allowed)
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ docs: [] });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'free' });
    expect(res.status).toBe(200);
    expect(db.set).toHaveBeenCalledTimes(1);
    const setArg = db.set.mock.calls[0][0] as { userId: string; vapiCallId: null };
    expect(setArg.userId).toBe('user1');
    expect(setArg.vapiCallId).toBeNull();
  });

  it('returns maxDurationSeconds of 420 for a daily (midday) call', async () => {
    db.get
      .mockResolvedValueOnce({ exists: false })      // quota gate
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ docs: [] });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(200);
    expect(res.body.maxDurationSeconds).toBe(420);
  });

  it('returns maxDurationSeconds of 900 for a weekly call', async () => {
    db.get
      .mockResolvedValueOnce({ exists: false })      // quota gate
      .mockResolvedValueOnce({ exists: false })      // profile
      .mockResolvedValueOnce({ exists: false })      // current week doc
      .mockResolvedValueOnce({ exists: false })      // today session
      .mockResolvedValueOnce({ docs: [] })           // history
      .mockResolvedValueOnce({ empty: false, docs: [{}] }); // first-session check (weekly only)
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'weekly' });
    expect(res.status).toBe(200);
    expect(res.body.maxDurationSeconds).toBe(900);
  });

  it('weekly first session (no weeks yet) produces a first-session prompt', async () => {
    db.get
      .mockResolvedValueOnce({ exists: false })      // quota gate
      .mockResolvedValueOnce({ exists: false })      // profile
      .mockResolvedValueOnce({ exists: false })      // current week doc
      .mockResolvedValueOnce({ exists: false })      // today session
      .mockResolvedValueOnce({ docs: [] })           // history
      .mockResolvedValueOnce({ empty: true, docs: [] }); // first-session check: no weeks
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'weekly' });
    expect(res.status).toBe(200);
    expect(res.body.systemPrompt).toMatch(/first session/i);
  });
});

describe('POST /vapi/init-call — weekly quota gate', () => {
  // The gate reads the user doc FIRST (before profile/week/etc.)
  it('returns 402 when the user has exhausted their weekly quota', async () => {
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ weeklyVoiceQuotaSeconds: 3900, voiceSecondsUsedThisWeek: 3900, usageWeekId: weekId('user1', new Date()) }),
    });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('weekly_quota_exhausted');
    expect(res.body.remainingSeconds).toBe(0);
  });

  it('allows the call when under quota', async () => {
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ weeklyVoiceQuotaSeconds: 3900, voiceSecondsUsedThisWeek: 600 }),
      }) // gate read
      .mockResolvedValueOnce({ exists: false }) // profile
      .mockResolvedValueOnce({ exists: false }) // week
      .mockResolvedValueOnce({ exists: false }) // today session
      .mockResolvedValueOnce({ docs: [] });     // history
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(200);
  });

  it('treats stale-week usage as 0 so the new week is allowed', async () => {
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ weeklyVoiceQuotaSeconds: 3900, voiceSecondsUsedThisWeek: 9999, usageWeekId: 'user1_2026-W01' }),
      })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ docs: [] });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(200);
  });

  it('caps maxDurationSeconds at the remaining balance when it is below the per-call cap', async () => {
    // Standard quota 3900s, already used 3800s → only 100s left. A daily call's cap is 420s,
    // but the call must hard-stop at 100s so it can't overrun the weekly pool.
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          weeklyVoiceQuotaSeconds: 3900,
          voiceSecondsUsedThisWeek: 3800,
          usageWeekId: weekId('user1', new Date()),
        }),
      })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ docs: [] });
    const res = await request(app).post('/vapi/init-call')
      .set('Authorization', 'Bearer t').send({ callType: 'midday' });
    expect(res.status).toBe(200);
    expect(res.body.maxDurationSeconds).toBe(100);
    expect(res.body.remainingSeconds).toBe(100);
  });
});
