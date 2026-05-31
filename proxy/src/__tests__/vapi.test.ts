import request from 'supertest';
import { app } from '../index';

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
    // users doc (profile)
    db.get
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
});
