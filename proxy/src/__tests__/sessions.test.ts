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
    get: jest.fn(),
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
    get: jest.Mock;
    update: jest.Mock;
  };
};

const sampleActions = [
  { id: 'action1', title: 'Send cold emails', isCompleted: false, completedAt: null },
  { id: 'action2', title: 'Update portfolio', isCompleted: true, completedAt: '2026-05-19T10:00:00.000Z' },
];

const sessionDocData = (overrides: object = {}) => ({
  userId: 'user1',
  date: '2026-05-19',
  microActions: `enc(${JSON.stringify(sampleActions)})`,
  tomorrowMicroActions: null,
  morningCallId: null,
  eveningCallId: null,
  score: null,
  scoreRationale: null,
  ...overrides,
});

describe('GET /sessions', () => {
  it('returns decrypted sessions for the given date range', async () => {
    db.collection.mockReturnThis();
    db.where.mockReturnThis();
    db.get.mockResolvedValueOnce({
      docs: [
        {
          id: 'user1_2026-05-19',
          data: () => sessionDocData({ score: 8, scoreRationale: 'enc(Solid day)' }),
        },
      ],
    });

    const res = await request(app)
      .get('/sessions?from=2026-05-01&to=2026-05-31')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].date).toBe('2026-05-19');
    expect(res.body[0].microActions).toHaveLength(2);
    expect(res.body[0].score).toBe(8);
    expect(res.body[0].scoreRationale).toBe('Solid day');
  });

  it('returns 400 when from or to is missing', async () => {
    const res = await request(app)
      .get('/sessions?from=2026-05-01')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
  });
});

describe('GET /sessions/:date', () => {
  it('returns decrypted session with correct structure', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({
      exists: true,
      id: 'user1_2026-05-19',
      data: () => sessionDocData({ morningCallId: 'call-abc' }),
    });

    const res = await request(app)
      .get('/sessions/2026-05-19')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user1_2026-05-19');
    expect(res.body.date).toBe('2026-05-19');
    expect(res.body.userId).toBe('user1');
    expect(res.body.microActions).toHaveLength(2);
    expect(res.body.microActions[0].id).toBe('action1');
    expect(res.body.morningCallId).toBe('call-abc');
  });

  it('returns empty session template for an unknown date', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .get('/sessions/2020-01-01')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user1_2020-01-01');
    expect(res.body.date).toBe('2020-01-01');
    expect(res.body.microActions).toEqual([]);
    expect(res.body.score).toBeNull();
    expect(res.body.morningCallId).toBeNull();
    expect(res.body.tomorrowMicroActions).toBeNull();
  });
});

describe('PUT /sessions/:date/microactions/:actionId/complete', () => {
  it('updates isCompleted and completedAt for the specified action', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({
      exists: true,
      id: 'user1_2026-05-19',
      data: () => sessionDocData(),
    });

    const res = await request(app)
      .put('/sessions/2026-05-19/microactions/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
    const action1 = res.body.microActions.find((a: { id: string }) => a.id === 'action1');
    expect(action1).toBeDefined();
    expect(action1.isCompleted).toBe(true);
    expect(action1.completedAt).toBeTruthy();
  });

  it('returns 400 when isCompleted is not a boolean', async () => {
    const res = await request(app)
      .put('/sessions/2026-05-19/microactions/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when session does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .put('/sessions/2099-01-01/microactions/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(res.status).toBe(404);
  });
});
