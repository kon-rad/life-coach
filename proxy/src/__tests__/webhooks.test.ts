import request from 'supertest';
import { app } from '../index';
import { weekId } from '../services/weeks';

const VAPI_SECRET = 'test-secret';
const RC_SECRET = 'test-rc-secret';

beforeAll(() => {
  process.env.VAPI_WEBHOOK_SECRET = VAPI_SECRET;
  process.env.REVENUECAT_WEBHOOK_SECRET = RC_SECRET;
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

jest.mock('../services/togetherAI', () => ({
  analyzeCall: jest.fn().mockResolvedValue({
    summary: 'Good call', score: 7, scoreRationale: 'Solid effort.',
  }),
  generateRetrospective: jest.fn().mockResolvedValue({
    wentWell: 'Shipped API', improve: 'Start earlier',
    onePercent: 'Plan the night before', summary: 'Solid week',
  }),
  scoreDay: jest.fn().mockResolvedValue({
    score: 7, summary: 'Productive day', advice: 'Start the hardest task first tomorrow.',
  }),
  rescoreDay: jest.fn().mockResolvedValue(8),
}));

jest.mock('../prompts', () => ({
  buildRetrospectivePrompt: jest.fn().mockReturnValue('retro prompt'),
  buildDayScorePrompt: jest.fn().mockReturnValue('day score prompt'),
  buildRescorePrompt: jest.fn().mockReturnValue('rescore prompt'),
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
  };
};

const {
  analyzeCall: mockAnalyzeCall,
  generateRetrospective: mockGenerateRetrospective,
  scoreDay: mockScoreDay,
  rescoreDay: mockRescoreDay,
} = jest.requireMock('../services/togetherAI') as {
  analyzeCall: jest.Mock;
  generateRetrospective: jest.Mock;
  scoreDay: jest.Mock;
  rescoreDay: jest.Mock;
};

const { adminAuth } = jest.requireMock('../services/firebase') as {
  adminAuth: { verifyIdToken: jest.Mock };
};

const prompts = jest.requireMock('../prompts') as {
  buildRetrospectivePrompt: jest.Mock;
  buildDayScorePrompt: jest.Mock;
  buildRescorePrompt: jest.Mock;
};

const enc = jest.requireMock('../services/encryption') as {
  encrypt: jest.Mock; decrypt: jest.Mock; encryptJSON: jest.Mock; decryptJSON: jest.Mock;
};

beforeEach(() => {
  jest.resetAllMocks();
  adminAuth.verifyIdToken.mockResolvedValue({ uid: 'user1' });
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  db.update.mockResolvedValue(undefined);
  enc.encrypt.mockImplementation((p: string) => Promise.resolve(`enc(${p})`));
  enc.decrypt.mockImplementation((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, '')));
  enc.encryptJSON.mockImplementation((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`));
  enc.decryptJSON.mockImplementation((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, ''))));
  mockAnalyzeCall.mockResolvedValue({ summary: 'Good call', score: 7, scoreRationale: 'Solid effort.' });
  mockScoreDay.mockResolvedValue({
    score: 7, summary: 'Productive day', advice: 'Start the hardest task first tomorrow.',
  });
  mockGenerateRetrospective.mockResolvedValue({
    wentWell: 'Shipped API', improve: 'Start earlier',
    onePercent: 'Plan the night before', summary: 'Solid week',
  });
  mockRescoreDay.mockResolvedValue(8);
  prompts.buildRetrospectivePrompt.mockReturnValue('retro prompt');
  prompts.buildDayScorePrompt.mockReturnValue('day score prompt');
  prompts.buildRescorePrompt.mockReturnValue('rescore prompt');
});

function makeVapiBody(callType: string, overrides: object = {}) {
  return {
    message: {
      type: 'end-of-call-report',
      call: { id: 'c1', metadata: { userId: 'user1', callType, conversationId: 'conv1' } },
      transcript: 'hello world',
      durationSeconds: 300,
      ...overrides,
    },
  };
}

// ─── VAPI webhooks — security ─────────────────────────────────────────────────

describe('POST /webhooks/vapi — security', () => {
  it('returns 401 for invalid VAPI secret', async () => {
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', 'wrong-secret')
      .send(makeVapiBody('midday'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when VAPI secret header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/vapi')
      .send(makeVapiBody('midday'));
    expect(res.status).toBe(401);
  });
});

// ─── VAPI webhooks — midday call ──────────────────────────────────────────────

describe('POST /webhooks/vapi — midday call', () => {
  it('acknowledges and updates conversation', async () => {
    // midday branch skips session writes; still accumulates voice usage then updates conversation
    db.get.mockResolvedValue({ exists: true, data: () => ({}) });
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('midday'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(db.update).toHaveBeenCalled();
  });
});

// ─── VAPI webhooks — evening call ────────────────────────────────────────────

describe('POST /webhooks/vapi — evening call', () => {
  it('updates today session with score and advice', async () => {
    const tasks = [{ id: 'a1', title: 'Do thing', isCompleted: false, completedAt: null }];
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user1', date: '2026-05-19', tasks: `enc(${JSON.stringify(tasks)})` }),
      })
      .mockResolvedValueOnce({ exists: false })   // current week doc (scoring context)
      .mockResolvedValueOnce({ exists: false })   // tomorrow session
      .mockResolvedValueOnce({ exists: false });   // user doc

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('evening'));

    expect(res.status).toBe(200);
    const scoreUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { score?: number }).score !== undefined,
    );
    expect(scoreUpdate).toBeDefined();
    expect((scoreUpdate![0] as { score: number }).score).toBe(7);
    // advice is persisted (encrypted) alongside the score
    expect((scoreUpdate![0] as { advice?: string }).advice).toBe('enc(Start the hardest task first tomorrow.)');
  });

  it('sets up tomorrow session skeleton', async () => {
    const tasks = [{ id: 'a1', title: 'Do thing', isCompleted: false, completedAt: null }];
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user1', date: '2026-05-19', tasks: `enc(${JSON.stringify(tasks)})` }),
      })
      .mockResolvedValueOnce({ exists: false })   // current week doc
      .mockResolvedValueOnce({ exists: false })   // tomorrow session
      .mockResolvedValueOnce({ exists: false });   // user doc

    await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('evening'));

    const tomorrowSet = db.set.mock.calls.find(
      (c) => (c[0] as { middayCallId?: null }).middayCallId !== undefined,
    );
    expect(tomorrowSet).toBeDefined();
  });

  it('updates user voice seconds', async () => {
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user1', date: '2026-05-19', tasks: `enc(${JSON.stringify([])})` }),
      })
      .mockResolvedValueOnce({ exists: false })   // current week doc
      .mockResolvedValueOnce({ exists: false })   // tomorrow session
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ totalVoiceSecondsUsed: 600, voiceSecondsUsedThisWeek: 300, usageWeekId: weekId('user1', new Date()) }),
      });

    await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('evening'));

    const userUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { totalVoiceSecondsUsed?: number }).totalVoiceSecondsUsed !== undefined,
    );
    expect(userUpdate).toBeDefined();
    expect((userUpdate![0] as { totalVoiceSecondsUsed: number }).totalVoiceSecondsUsed).toBe(600 + 300);
  });
});

// ─── VAPI webhooks — voice usage applies to ALL call types ───────────────────

describe('POST /webhooks/vapi — voice usage accumulation', () => {
  it.each(['midday', 'weekly', 'free'])(
    'accumulates voice seconds for a %s call (not just evening)',
    async (callType) => {
      // generic doc mock: every get() returns a user-ish doc with prior usage
      db.get.mockResolvedValue({
        exists: true,
        data: () => ({
          totalVoiceSecondsUsed: 100,
          voiceSecondsUsedThisWeek: 100,
          usageWeekId: weekId('user1', new Date()),
          tasks: `enc(${JSON.stringify([])})`,
        }),
      });

      await request(app)
        .post('/webhooks/vapi')
        .set('x-vapi-secret', VAPI_SECRET)
        .send(makeVapiBody(callType));

      const usageUpdate = db.update.mock.calls.find(
        (c) => (c[0] as { voiceSecondsUsedThisWeek?: number }).voiceSecondsUsedThisWeek !== undefined,
      );
      expect(usageUpdate).toBeDefined();
      expect((usageUpdate![0] as { voiceSecondsUsedThisWeek: number }).voiceSecondsUsedThisWeek).toBe(100 + 300);
    },
  );

  it('stamps the current usageWeekId when accumulating', async () => {
    db.get.mockResolvedValue({
      exists: true,
      data: () => ({ tasks: `enc(${JSON.stringify([])})` }),
    });

    await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('free'));

    const usageUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { usageWeekId?: string }).usageWeekId !== undefined,
    );
    expect(usageUpdate).toBeDefined();
    expect((usageUpdate![0] as { usageWeekId: string }).usageWeekId).toBe(weekId('user1', new Date()));
  });
});

// ─── VAPI webhooks — weekly call ─────────────────────────────────────────────

describe('POST /webhooks/vapi — weekly call', () => {
  it('marks the week complete and writes a retrospective', async () => {
    db.get.mockResolvedValue({ exists: true, data: () => ({
      weekNumber: 23, year: 2026, startDate: '2026-06-01', endDate: '2026-06-07',
      tasks: `enc(${JSON.stringify([{ id: 't1', title: 'A', isCompleted: true, completedAt: null }])})`,
    }) });
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('weekly'));
    expect(res.status).toBe(200);
    expect(db.set).toHaveBeenCalled();
  });

  it('does NOT retrospect a first-session weekly call (the week was just created)', async () => {
    // Subsequent reads (user-usage doc) return non-existent so accumulation no-ops.
    db.get.mockResolvedValue({ exists: false });
    // First read in the weekly branch is the conversation doc carrying the flag.
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({ isFirstSession: true }) });
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('weekly'));
    expect(res.status).toBe(200);
    // The just-planned current week must stay active — no retro, no 'complete'.
    expect(mockGenerateRetrospective).not.toHaveBeenCalled();
  });
});

// ─── VAPI webhooks — past-day rescoring ──────────────────────────────────────

describe('POST /webhooks/vapi — past-day rescoring', () => {
  it('rescores a past day edited during the call, updating ONLY its score', async () => {
    const tasks = [{ id: 't1', title: 'A', isCompleted: true, completedAt: null }];
    db.get
      .mockResolvedValueOnce({ exists: false }) // user usage doc (accumulateVoiceUsage no-ops)
      .mockResolvedValueOnce({                  // conversation doc with the edited dates
        exists: true,
        data: () => ({ editedPastDates: ['2000-01-02'] }),
      })
      .mockResolvedValueOnce({                  // the past day's session — already scored
        exists: true,
        data: () => ({ score: 4, tasks: `enc(${JSON.stringify(tasks)})` }),
      })
      .mockResolvedValueOnce({ exists: false }); // that day's week doc

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('free'));

    expect(res.status).toBe(200);
    expect(mockRescoreDay).toHaveBeenCalledWith('rescore prompt');
    const scoreUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { score?: number }).score !== undefined,
    );
    expect(scoreUpdate).toBeDefined();
    // Only the score is touched — summary/advice are deliberately preserved.
    expect(scoreUpdate![0]).toEqual({ score: 8 });
  });

  it('does NOT rescore a never-scored day (scoring stays the evening call\'s job)', async () => {
    db.get
      .mockResolvedValueOnce({ exists: false }) // user usage doc
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ editedPastDates: ['2000-01-02'] }),
      })
      .mockResolvedValueOnce({                  // session exists but has no score yet
        exists: true,
        data: () => ({ score: null, tasks: `enc(${JSON.stringify([])})` }),
      });

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('free'));

    expect(res.status).toBe(200);
    expect(mockRescoreDay).not.toHaveBeenCalled();
  });

  it('does not rescore when the conversation has no edited dates', async () => {
    db.get.mockResolvedValue({ exists: true, data: () => ({}) });

    await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeVapiBody('free'));

    expect(mockRescoreDay).not.toHaveBeenCalled();
  });
});

// ─── VAPI webhooks — other event types ───────────────────────────────────────

describe('POST /webhooks/vapi — non-end-of-call events', () => {
  it('acknowledges non-end-of-call events silently', async () => {
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send({ message: { type: 'status-update', call: { id: 'c1' } } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

// ─── RevenueCat webhooks ──────────────────────────────────────────────────────

describe('POST /webhooks/revenuecat — security', () => {
  it('returns 401 for invalid secret', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', 'Bearer wrong-secret')
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1' } });
    expect(res.status).toBe(401);
  });
});

describe('POST /webhooks/revenuecat — subscription events', () => {
  it('sets subscriptionStatus to premium on INITIAL_PURCHASE', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1', product_id: 'soularc_premium_yearly' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(db.set).toHaveBeenCalledTimes(1);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('premium');
  });

  it('sets standard tier + 3900s quota for a standard product', async () => {
    await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1', product_id: 'soularc_standard_weekly' } });
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string; weeklyVoiceQuotaSeconds: number };
    expect(setData.subscriptionStatus).toBe('standard');
    expect(setData.weeklyVoiceQuotaSeconds).toBe(3900);
  });

  it('sets premium tier + 6900s quota for a premium product', async () => {
    await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1', product_id: 'soularc_premium_weekly' } });
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string; weeklyVoiceQuotaSeconds: number };
    expect(setData.subscriptionStatus).toBe('premium');
    expect(setData.weeklyVoiceQuotaSeconds).toBe(6900);
  });

  it('zeroes the quota on EXPIRATION', async () => {
    await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'EXPIRATION', app_user_id: 'user1' } });
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string; weeklyVoiceQuotaSeconds: number };
    expect(setData.subscriptionStatus).toBe('free');
    expect(setData.weeklyVoiceQuotaSeconds).toBe(0);
  });

  it('sets subscriptionStatus to premium on RENEWAL', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'RENEWAL', app_user_id: 'user2' } });
    expect(res.status).toBe(200);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('premium');
  });

  it('sets subscriptionStatus to premium on UNCANCELLATION', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'UNCANCELLATION', app_user_id: 'user3' } });
    expect(res.status).toBe(200);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('premium');
  });

  it('sets subscriptionStatus to free on EXPIRATION', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'EXPIRATION', app_user_id: 'user1' } });
    expect(res.status).toBe(200);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('free');
  });

  it('sets subscriptionStatus to free on CANCELLATION', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'CANCELLATION', app_user_id: 'user1' } });
    expect(res.status).toBe(200);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('free');
  });

  it('returns received:true for unknown event type without error', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({ event: { type: 'BILLING_ISSUE', app_user_id: 'user1' } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(db.set).not.toHaveBeenCalled();
  });

  it('returns 400 for missing event payload', async () => {
    const res = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
