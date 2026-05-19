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

const existingMessages = [
  { id: 'msg1', role: 'user', content: 'Hello', timestamp: '2026-05-19T08:00:00.000Z' },
  { id: 'msg2', role: 'assistant', content: 'Hi there!', timestamp: '2026-05-19T08:00:01.000Z' },
];

const conversationDoc = {
  exists: true,
  id: 'conv1',
  data: () => ({
    userId: 'user1',
    type: 'freeChat',
    messages: `enc(${JSON.stringify(existingMessages)})`,
    vapiCallId: null,
    durationSeconds: null,
    createdAt: '2026-05-19T08:00:00.000Z',
    summary: 'enc(User asked about their project)',
  }),
};

const listSnapshot = {
  docs: [conversationDoc],
};

beforeEach(() => {
  jest.clearAllMocks();
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.orderBy.mockReturnThis();
  db.limit.mockReturnThis();
});

describe('GET /conversations', () => {
  it('returns list with decrypted summary and empty messages array', async () => {
    db.get.mockResolvedValueOnce(listSnapshot);

    const res = await request(app)
      .get('/conversations')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);

    const conv = res.body[0] as {
      id: string;
      type: string;
      messages: unknown[];
      summary: string;
    };
    expect(conv.id).toBe('conv1');
    expect(conv.type).toBe('freeChat');
    expect(conv.messages).toEqual([]);
    expect(conv.summary).toBe('User asked about their project');
  });

  it('does not include full messages in list response', async () => {
    db.get.mockResolvedValueOnce(listSnapshot);

    const res = await request(app)
      .get('/conversations')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    const conv = res.body[0] as { messages: unknown[] };
    expect(conv.messages).toHaveLength(0);
  });
});

describe('POST /conversations', () => {
  it('creates a conversation with the given type and returns it', async () => {
    const res = await request(app)
      .post('/conversations')
      .set('Authorization', 'Bearer valid-token')
      .send({ type: 'freeChat' });

    expect(res.status).toBe(201);
    const body = res.body as {
      id: string;
      type: string;
      userId: string;
      messages: unknown[];
      summary: string;
    };
    expect(body.type).toBe('freeChat');
    expect(body.userId).toBe('user1');
    expect(body.messages).toEqual([]);
    expect(body.summary).toBe('');
    expect(typeof body.id).toBe('string');
    expect(db.set).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid conversation type', async () => {
    const res = await request(app)
      .post('/conversations')
      .set('Authorization', 'Bearer valid-token')
      .send({ type: 'invalidType' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await request(app)
      .post('/conversations')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /conversations/:id', () => {
  it('returns decrypted messages and summary for owned conversation', async () => {
    db.get.mockResolvedValueOnce(conversationDoc);

    const res = await request(app)
      .get('/conversations/conv1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    const body = res.body as {
      id: string;
      messages: Array<{ role: string; content: string }>;
      summary: string;
    };
    expect(body.id).toBe('conv1');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].content).toBe('Hello');
    expect(body.messages[1].content).toBe('Hi there!');
    expect(body.summary).toBe('User asked about their project');
  });

  it('returns 404 when conversation does not exist', async () => {
    db.get.mockResolvedValueOnce({ exists: false });

    const res = await request(app)
      .get('/conversations/nonexistent')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  it('returns 403 when conversation belongs to another user', async () => {
    db.get.mockResolvedValueOnce({
      exists: true,
      id: 'conv2',
      data: () => ({
        userId: 'other-user',
        type: 'freeChat',
        messages: `enc(${JSON.stringify([])})`,
        createdAt: '2026-05-19T08:00:00.000Z',
        summary: 'enc()',
      }),
    });

    const res = await request(app)
      .get('/conversations/conv2')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});
