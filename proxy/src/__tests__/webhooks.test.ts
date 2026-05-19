import request from 'supertest';
import { app } from '../index';

const VAPI_SECRET = 'test-vapi-secret';
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

const existingActions = [
  { id: 'a1', title: 'Write landing page', isCompleted: false, completedAt: null },
  { id: 'a2', title: 'Set up Stripe', isCompleted: false, completedAt: null },
  { id: 'a3', title: 'Email users', isCompleted: false, completedAt: null },
];

const convSnapshot = (conversationId: string) => ({
  docs: [{ id: conversationId }],
});

const emptyConvSnapshot = { docs: [] };

beforeEach(() => {
  jest.clearAllMocks();
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  db.update.mockResolvedValue(undefined);
});

// ─── VAPI webhooks ────────────────────────────────────────────────────────────

describe('POST /webhooks/vapi — security', () => {
  it('returns 401 for invalid VAPI secret', async () => {
    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', 'wrong-secret')
      .send({ callId: 'c1', userId: 'user1', callType: 'morning', transcript: '', durationSeconds: 60 });

    expect(res.status).toBe(401);
  });

  it('returns 401 when VAPI secret header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/vapi')
      .send({ callId: 'c1', userId: 'user1', callType: 'morning', transcript: '' });

    expect(res.status).toBe(401);
  });
});

describe('POST /webhooks/vapi — morning call', () => {
  const morningBody = {
    event: 'call.ended',
    callId: 'vapi-call-1',
    userId: 'user1',
    callType: 'morning',
    transcript: 'Good morning...',
    structuredOutput: {
      microActions: [
        { id: 'a1', title: 'Write landing page copy' },
        { id: 'a2', title: 'Set up Stripe checkout' },
        { id: 'a3', title: 'Email 5 potential users' },
      ],
    },
    durationSeconds: 312,
  };

  it('creates session with 3 micro-actions when session does not exist', async () => {
    // get() calls: (1) conv query, (2) session doc
    db.get
      .mockResolvedValueOnce(convSnapshot('conv-1'))   // conversations query
      .mockResolvedValueOnce({ exists: false });        // session doc

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(morningBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // Session created via set
    expect(db.set).toHaveBeenCalledTimes(1);
    const setCall = db.set.mock.calls[0][0] as {
      userId: string;
      microActions: string;
      morningCallId: string;
    };
    expect(setCall.userId).toBe('user1');
    expect(setCall.morningCallId).toBe('conv-1');
    // microActions encrypted and contains the 3 actions
    expect(setCall.microActions).toContain('Write landing page copy');
  });

  it('updates existing session with morning micro-actions', async () => {
    db.get
      .mockResolvedValueOnce(emptyConvSnapshot)              // conversations query
      .mockResolvedValueOnce({                               // session doc exists
        exists: true,
        data: () => ({ userId: 'user1', date: '2026-05-19', microActions: `enc(${JSON.stringify([])})` }),
      });

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(morningBody);

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    const updateCall = db.update.mock.calls[0][0] as { microActions: string };
    expect(updateCall.microActions).toContain('Set up Stripe checkout');
  });

  it('updates conversation transcript when conversation is found', async () => {
    db.get
      .mockResolvedValueOnce(convSnapshot('conv-abc'))
      .mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(morningBody);

    expect(res.status).toBe(200);
    // set for session + update for conversation = 2 total write ops
    const allUpdateCalls = db.update.mock.calls;
    const convUpdate = allUpdateCalls.find(
      (c) => typeof (c[0] as { durationSeconds?: number }).durationSeconds === 'number',
    );
    expect(convUpdate).toBeDefined();
    expect((convUpdate![0] as { durationSeconds: number }).durationSeconds).toBe(312);
  });
});

describe('POST /webhooks/vapi — evening call', () => {
  const eveningBody = {
    event: 'call.ended',
    callId: 'vapi-call-2',
    userId: 'user1',
    callType: 'evening',
    transcript: 'Good evening...',
    structuredOutput: {
      completedActionIds: ['a1', 'a3'],
      score: 7,
      scoreRationale: 'Solid progress on two out of three tasks.',
      tomorrowMicroActions: [
        { id: 'b1', title: 'Finalize pricing page' },
        { id: 'b2', title: 'Schedule user interviews' },
        { id: 'b3', title: 'Write blog post outline' },
      ],
    },
    durationSeconds: 287,
  };

  it('updates today session with score and marks completed action IDs', async () => {
    // get() calls: (1) session, (2) conv query, (3) tomorrow session, (4) user doc
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: 'user1',
          date: '2026-05-19',
          microActions: `enc(${JSON.stringify(existingActions)})`,
        }),
      })
      .mockResolvedValueOnce(convSnapshot('conv-2'))   // conversations query
      .mockResolvedValueOnce({ exists: false })         // tomorrow session
      .mockResolvedValueOnce({ exists: false });        // user doc

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(eveningBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // Today's session updated
    const todayUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { score?: number }).score !== undefined,
    );
    expect(todayUpdate).toBeDefined();
    const todayUpdateData = todayUpdate![0] as {
      score: number;
      eveningCallId: string;
      scoreRationale: string;
      microActions: string;
    };
    expect(todayUpdateData.score).toBe(7);
    expect(todayUpdateData.eveningCallId).toBe('conv-2');
    // completed actions a1 and a3 should be marked done in encrypted payload
    expect(todayUpdateData.microActions).toContain('Write landing page');
  });

  it('writes tomorrow micro-actions to the tomorrow session document', async () => {
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: 'user1',
          date: '2026-05-19',
          microActions: `enc(${JSON.stringify(existingActions)})`,
        }),
      })
      .mockResolvedValueOnce(emptyConvSnapshot)
      .mockResolvedValueOnce({ exists: false })   // tomorrow session doesn't exist
      .mockResolvedValueOnce({ exists: false });   // user doc

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(eveningBody);

    expect(res.status).toBe(200);

    // Find the set() call for tomorrow's session (contains tomorrowMicroActions field)
    const tomorrowSet = db.set.mock.calls.find(
      (c) => (c[0] as { tomorrowMicroActions?: string }).tomorrowMicroActions !== undefined,
    );
    expect(tomorrowSet).toBeDefined();
    const tomorrowData = tomorrowSet![0] as { tomorrowMicroActions: string };
    expect(tomorrowData.tomorrowMicroActions).toContain('Finalize pricing page');
  });

  it('updates user voice seconds in Firestore', async () => {
    db.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          userId: 'user1',
          date: '2026-05-19',
          microActions: `enc(${JSON.stringify([])})`,
        }),
      })
      .mockResolvedValueOnce(emptyConvSnapshot)
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ totalVoiceSecondsUsed: 600, voiceMinutesUsedThisWeek: 300 }),
      });

    const res = await request(app)
      .post('/webhooks/vapi')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(eveningBody);

    expect(res.status).toBe(200);

    const userUpdate = db.update.mock.calls.find(
      (c) => (c[0] as { totalVoiceSecondsUsed?: number }).totalVoiceSecondsUsed !== undefined,
    );
    expect(userUpdate).toBeDefined();
    const updateData = userUpdate![0] as {
      totalVoiceSecondsUsed: number;
      voiceMinutesUsedThisWeek: number;
    };
    expect(updateData.totalVoiceSecondsUsed).toBe(600 + 287);
    expect(updateData.voiceMinutesUsedThisWeek).toBe(300 + 287);
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
      .send({ event: { type: 'INITIAL_PURCHASE', app_user_id: 'user1' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    expect(db.set).toHaveBeenCalledTimes(1);
    const setData = db.set.mock.calls[0][0] as { subscriptionStatus: string };
    expect(setData.subscriptionStatus).toBe('premium');
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
