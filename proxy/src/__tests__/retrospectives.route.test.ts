import request from 'supertest';
import { app } from '../index';

jest.mock('../services/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }) },
  db: { collection: jest.fn().mockReturnThis(), doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), get: jest.fn() },
}));
jest.mock('../services/encryption', () => ({
  encrypt: jest.fn((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn((c: string) => Promise.resolve(c.replace(/^enc\(/, '').replace(/\)$/, ''))),
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));
const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

const retroDoc = {
  userId: 'user1', weekId: 'user1_2026-W23', weekNumber: 23, year: 2026,
  startDate: '2026-06-01', endDate: '2026-06-07',
  wentWell: 'enc(Shipped)', improve: 'enc(Earlier)', onePercent: 'enc(Plan ahead)',
  summary: 'enc(Good week)', createdAt: '2026-06-07T19:30:00Z',
};

describe('GET /retrospectives', () => {
  it('returns decrypted retrospectives newest first', async () => {
    db.get.mockResolvedValueOnce({ docs: [{ id: 'user1_2026-W23', data: () => retroDoc }] });
    const res = await request(app).get('/retrospectives').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body[0].summary).toBe('Good week');
    expect(res.body[0].onePercent).toBe('Plan ahead');
  });
});
