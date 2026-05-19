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

jest.mock('../services/togetherAI', () => ({
  streamChat: jest.fn(),
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

const { streamChat } = jest.requireMock('../services/togetherAI') as {
  streamChat: jest.Mock;
};

const existingMessages = [
  { id: 'msg1', role: 'assistant', content: 'Hello! What are you working on today?', timestamp: '2026-05-19T08:00:00.000Z' },
];

const conversationDoc = {
  exists: true,
  data: () => ({
    userId: 'user1',
    type: 'freeChat',
    messages: `enc(${JSON.stringify(existingMessages)})`,
    createdAt: '2026-05-19T08:00:00.000Z',
  }),
};

const projectDoc = {
  exists: true,
  data: () => ({
    userId: 'user1',
    title: 'enc(Launch my SaaS)',
    description: 'enc(A project about building and launching a SaaS product.)',
    createdAt: '2026-05-01T00:00:00.000Z',
    isActive: true,
  }),
};

const sessionsSnapshot = {
  docs: [],
};

function setupDbSequence() {
  // Firestore calls in order:
  // 1. conversations.doc(conversationId).get() → conversationDoc
  // 2. projects.doc(`user1_active`).get() → projectDoc
  // 3. sessions.where(...).get() → sessionsSnapshot
  // 4. conversations.doc(conversationId).update() → resolved (already mocked)
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.where.mockReturnThis();
  db.get
    .mockResolvedValueOnce(conversationDoc)
    .mockResolvedValueOnce(projectDoc)
    .mockResolvedValueOnce(sessionsSnapshot);
}

beforeEach(() => {
  jest.clearAllMocks();
  streamChat.mockImplementation(
    async (_messages: unknown, onDelta: (d: string) => void) => {
      onDelta('Great');
      onDelta(' work!');
      return 'Great work!';
    },
  );
});

describe('POST /chat', () => {
  it('returns 400 when conversationId or message is missing', async () => {
    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: 'Hello' });

    expect(res.status).toBe(400);
  });

  it('calls streamChat with correct message array including system prompt', async () => {
    setupDbSequence();

    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'conv1', message: 'I need help staying motivated.' });

    expect(res.status).toBe(200);
    expect(streamChat).toHaveBeenCalledTimes(1);

    const [calledMessages] = streamChat.mock.calls[0] as [
      Array<{ role: string; content: string }>,
      unknown,
    ];

    expect(calledMessages[0].role).toBe('system');
    expect(calledMessages[calledMessages.length - 1]).toEqual({
      role: 'user',
      content: 'I need help staying motivated.',
    });
  });

  it('includes project title in system prompt', async () => {
    setupDbSequence();

    await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'conv1', message: 'What should I do today?' });

    const [calledMessages] = streamChat.mock.calls[0] as [
      Array<{ role: string; content: string }>,
      unknown,
    ];

    expect(calledMessages[0].content).toContain('Launch my SaaS');
  });

  it('includes existing conversation history in messages sent to Together AI', async () => {
    setupDbSequence();

    await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'conv1', message: 'Follow-up question.' });

    const [calledMessages] = streamChat.mock.calls[0] as [
      Array<{ role: string; content: string }>,
      unknown,
    ];

    const assistantMsg = calledMessages.find(
      (m) => m.role === 'assistant' && m.content === 'Hello! What are you working on today?',
    );
    expect(assistantMsg).toBeDefined();
  });

  it('saves new user message and assistant response to Firestore', async () => {
    setupDbSequence();

    await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'conv1', message: 'Save this.' });

    expect(db.update).toHaveBeenCalledTimes(1);
    const [updateArg] = db.update.mock.calls[0] as [{ messages: string }];
    expect(updateArg).toHaveProperty('messages');
    expect(typeof updateArg.messages).toBe('string');
  });

  it('streams SSE deltas and done event', async () => {
    setupDbSequence();

    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'conv1', message: 'Stream test.' });

    expect(res.text).toContain('"delta":"Great"');
    expect(res.text).toContain('"delta":" work!"');
    expect(res.text).toContain('"done":true');
  });
});
