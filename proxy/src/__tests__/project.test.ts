import request from 'supertest';
import { app } from '../index';

jest.mock('../services/togetherAI', () => ({
  complete: jest.fn().mockResolvedValue('A great description of the goal.'),
  streamChat: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }),
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
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
}));

const { db } = jest.requireMock('../services/firebase') as {
  db: {
    collection: jest.Mock;
    doc: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
  };
};

describe('GET /project', () => {
  it('returns decrypted project when document exists', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({
      exists: true,
      id: 'user1_active',
      data: () => ({
        userId: 'user1',
        title: 'enc(My Goal)',
        description: 'enc(A great goal)',
        createdAt: '2026-01-01T00:00:00.000Z',
        isActive: true,
      }),
    });

    const res = await request(app)
      .get('/project')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('My Goal');
    expect(res.body.description).toBe('A great goal');
    expect(res.body.id).toBe('user1_active');
  });

  it('returns 404 when no project document exists', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .get('/project')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /project', () => {
  it('creates project with encrypted fields and returns plaintext', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.set.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/project')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Launch my startup' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Launch my startup');
    expect(res.body.userId).toBe('user1');
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'enc(Launch my startup)',
        userId: 'user1',
        isActive: true,
      }),
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/project')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app)
      .post('/project')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
  });

  it('responds immediately with 201 before description generation completes', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.set.mockResolvedValue(undefined);

    const { complete } = jest.requireMock('../services/togetherAI') as { complete: jest.Mock };
    // Make complete slow to confirm response is not blocked
    complete.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve('slow description'), 500)),
    );

    const start = Date.now();
    const res = await request(app)
      .post('/project')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Build a startup' });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(201);
    expect(elapsed).toBeLessThan(400);
  });

  it('triggers description generation via togetherAI.complete', async () => {
    db.collection.mockReturnThis();
    db.doc.mockReturnThis();
    db.set.mockResolvedValue(undefined);
    db.update.mockResolvedValue(undefined);

    const { complete } = jest.requireMock('../services/togetherAI') as { complete: jest.Mock };
    complete.mockClear();

    await request(app)
      .post('/project')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Learn Spanish' });

    // Wait for setImmediate to fire
    await new Promise((resolve) => setImmediate(resolve));

    expect(complete).toHaveBeenCalledWith(expect.stringContaining('Learn Spanish'));
  });
});
