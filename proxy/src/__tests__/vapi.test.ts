import request from 'supertest';
import { app } from '../index';

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

jest.mock('../services/vapi', () => ({
  createVapiCall: jest.fn().mockResolvedValue({ vapiCallId: 'vapi-id-1', callToken: 'call-token-1' }),
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

const { createVapiCall } = jest.requireMock('../services/vapi') as {
  createVapiCall: jest.Mock;
};

const projectDoc = {
  exists: true,
  data: () => ({
    userId: 'user1',
    title: 'enc(Launch my SaaS)',
    description: 'enc(Build and ship a product that solves a real problem.)',
    createdAt: '2026-05-01T00:00:00.000Z',
    isActive: true,
  }),
};

const emptySessions = { docs: [] };

const todayMicroActions = [
  { id: 'a1', title: 'Write landing page copy', isCompleted: true, completedAt: '2026-05-19T10:00:00.000Z' },
  { id: 'a2', title: 'Set up Stripe', isCompleted: false, completedAt: null },
  { id: 'a3', title: 'Email 5 potential users', isCompleted: false, completedAt: null },
];

const todaySessionDoc = {
  exists: true,
  data: () => ({
    userId: 'user1',
    date: '2026-05-19',
    microActions: `enc(${JSON.stringify(todayMicroActions)})`,
    score: null,
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  (createVapiCall as jest.Mock).mockResolvedValue({ vapiCallId: 'vapi-id-1', callToken: 'call-token-1' });
});

describe('POST /vapi/init-call', () => {
  it('morning call prompt includes project title and micro-action instruction', async () => {
    db.get
      .mockResolvedValueOnce(projectDoc)   // project
      .mockResolvedValueOnce(emptySessions); // sessions

    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'morning' });

    expect(res.status).toBe(200);
    expect(createVapiCall).toHaveBeenCalledTimes(1);

    const callArgs = (createVapiCall as jest.Mock).mock.calls[0][0] as {
      systemPromptOverride: string;
      assistantId: string;
    };
    expect(callArgs.systemPromptOverride).toContain('Launch my SaaS');
    expect(callArgs.systemPromptOverride).toContain('microActions');
    expect(callArgs.systemPromptOverride).toContain('3 specific micro-actions');
  });

  it('evening call prompt includes today micro-actions', async () => {
    db.get
      .mockResolvedValueOnce(projectDoc)     // project
      .mockResolvedValueOnce(emptySessions)  // sessions
      .mockResolvedValueOnce(todaySessionDoc); // today's session

    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'evening' });

    expect(res.status).toBe(200);
    expect(createVapiCall).toHaveBeenCalledTimes(1);

    const callArgs = (createVapiCall as jest.Mock).mock.calls[0][0] as {
      systemPromptOverride: string;
    };
    expect(callArgs.systemPromptOverride).toContain('Launch my SaaS');
    expect(callArgs.systemPromptOverride).toContain('Write landing page copy');
    expect(callArgs.systemPromptOverride).toContain('completedActionIds');
  });

  it('creates a conversation record in Firestore', async () => {
    db.get
      .mockResolvedValueOnce(projectDoc)
      .mockResolvedValueOnce(emptySessions);

    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'morning' });

    expect(res.status).toBe(200);
    expect(db.set).toHaveBeenCalledTimes(1);

    const setArg = (db.set as jest.Mock).mock.calls[0][0] as {
      userId: string;
      type: string;
      vapiCallId: string;
    };
    expect(setArg.userId).toBe('user1');
    expect(setArg.type).toBe('morningCall');
    expect(setArg.vapiCallId).toBe('vapi-id-1');
  });

  it('returns vapiCallToken, callId, and vapiCallId', async () => {
    db.get
      .mockResolvedValueOnce(projectDoc)
      .mockResolvedValueOnce(emptySessions);

    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'morning' });

    expect(res.status).toBe(200);
    const body = res.body as { vapiCallToken: string; callId: string; vapiCallId: string };
    expect(body.vapiCallToken).toBe('call-token-1');
    expect(body.vapiCallId).toBe('vapi-id-1');
    expect(typeof body.callId).toBe('string');
  });

  it('returns 400 for invalid callType', async () => {
    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when callType is missing', async () => {
    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when no active project exists', async () => {
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .post('/vapi/init-call')
      .set('Authorization', 'Bearer valid-token')
      .send({ callType: 'morning' });

    expect(res.status).toBe(404);
  });
});
