import request from 'supertest';
import { app } from '../index';

jest.mock('../services/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }) },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../services/encryption', () => ({
  encrypt: jest.fn((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, ''))),
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));

const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

const weekTasks = [
  { id: 't1', title: 'Ship API', isCompleted: false, completedAt: null },
  { id: 't2', title: 'Write tests', isCompleted: false, completedAt: null },
  { id: 't3', title: 'Deploy', isCompleted: false, completedAt: null },
];
const weekDoc = (o: object = {}) => ({
  userId: 'user1', weekNumber: 23, year: 2026,
  startDate: '2026-06-01', endDate: '2026-06-07',
  tasks: `enc(${JSON.stringify(weekTasks)})`, status: 'active',
  retrospectiveId: null, createdAt: '2026-06-01T00:00:00Z', ...o,
});

describe('GET /weeks', () => {
  it('returns decrypted weeks', async () => {
    db.get.mockResolvedValueOnce({ docs: [{ id: 'user1_2026-W23', data: () => weekDoc() }] });
    const res = await request(app).get('/weeks').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body[0].weekNumber).toBe(23);
    expect(res.body[0].tasks).toHaveLength(3);
  });
});

describe('PUT /weeks/:weekKey/tasks/:taskId/complete', () => {
  it('toggles a week task', async () => {
    db.get.mockResolvedValueOnce({ exists: true, id: 'user1_2026-W23', data: () => weekDoc() });
    const res = await request(app)
      .put('/weeks/2026-W23/tasks/t1/complete')
      .set('Authorization', 'Bearer t')
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
    expect(res.body.tasks.find((t: { id: string }) => t.id === 't1').isCompleted).toBe(true);
  });
});
