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
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
  };
};

const sampleTasks = [
  { id: 'action1', title: 'Send cold emails', isCompleted: false, completedAt: null },
  { id: 'action2', title: 'Update portfolio', isCompleted: true, completedAt: '2026-05-19T10:00:00.000Z' },
];

const sessionDocData = (overrides: object = {}) => ({
  userId: 'user1',
  date: '2026-05-19',
  tasks: `enc(${JSON.stringify(sampleTasks)})`,
  weekId: 'user1_2026-W21',
  middayCallId: null,
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
    expect(res.body[0].tasks).toHaveLength(2);
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
      data: () => sessionDocData({ middayCallId: 'call-abc' }),
    });

    const res = await request(app)
      .get('/sessions/2026-05-19')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user1_2026-05-19');
    expect(res.body.date).toBe('2026-05-19');
    expect(res.body.userId).toBe('user1');
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0].id).toBe('action1');
    expect(res.body.middayCallId).toBe('call-abc');
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
    expect(res.body.tasks).toEqual([]);
    expect(res.body.score).toBeNull();
    expect(res.body.middayCallId).toBeNull();
  });
});

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

  it('returns 400 when isCompleted is not a boolean', async () => {
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when session does not exist', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .put('/sessions/2099-01-01/tasks/action1/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(res.status).toBe(404);
  });
});

describe('POST /sessions/:date/tasks', () => {
  it('adds a task, creating the session doc when absent', async () => {
    db.get.mockResolvedValueOnce({ exists: false });
    const res = await request(app)
      .post('/sessions/2026-06-02/tasks')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('New task');
    expect(res.body.tasks[0].isCompleted).toBe(false);
    expect(db.set).toHaveBeenCalled();
  });

  it('appends to an existing session (supports more than 3 day tasks)', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-05-19', data: () => sessionDocData() });
    const res = await request(app)
      .post('/sessions/2026-05-19/tasks')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Third task' });
    expect(res.status).toBe(201);
    expect(res.body.tasks).toHaveLength(3);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/sessions/2026-06-02/tasks')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /sessions/:date/tasks/:taskId (edit)', () => {
  it('renames a task', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-05-19', data: () => sessionDocData() });
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/action1')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Renamed task' });
    expect(res.status).toBe(200);
    expect(res.body.tasks.find((t: { id: string }) => t.id === 'action1').title).toBe('Renamed task');
  });

  it('toggles completion', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-05-19', data: () => sessionDocData() });
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/action1')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.tasks.find((t: { id: string }) => t.id === 'action1').isCompleted).toBe(true);
  });

  it('returns 400 when neither title nor isCompleted is provided', async () => {
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/action1')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when the task is not found', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => sessionDocData() });
    const res = await request(app)
      .put('/sessions/2026-05-19/tasks/missing')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /sessions/:date/tasks/:taskId', () => {
  it('removes a task', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-05-19', data: () => sessionDocData() });
    const res = await request(app)
      .delete('/sessions/2026-05-19/tasks/action1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks.find((t: { id: string }) => t.id === 'action1')).toBeUndefined();
  });

  it('returns 404 when the task is absent', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => sessionDocData() });
    const res = await request(app)
      .delete('/sessions/2026-05-19/tasks/missing')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});
