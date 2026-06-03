import request from 'supertest';
import { app } from '../index';

jest.mock('../services/firebase', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }),
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/encryption', () => ({
  encrypt: jest.fn().mockImplementation((p: string) => Promise.resolve(`enc(${p})`)),
  decrypt: jest.fn().mockImplementation((c: string) => Promise.resolve(c)),
  encryptJSON: jest.fn().mockImplementation((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn().mockImplementation((c: string) => Promise.resolve(JSON.parse(c))),
}));

const { db } = jest.requireMock('../services/firebase') as {
  db: { collection: jest.Mock; doc: jest.Mock; get: jest.Mock; set: jest.Mock };
};

const mockFetch = jest.fn();

beforeAll(() => {
  process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
  (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
  db.collection.mockReturnThis();
  db.doc.mockReturnThis();
  db.set.mockResolvedValue(undefined);
  mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
});

describe('POST /user/redeem-coupon', () => {
  it('grants a RevenueCat promo entitlement and records the redemption', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });

    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: 'NS2026' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'premium' });

    // RevenueCat REST API called for a lifetime promotional entitlement on user1.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/subscribers/user1/entitlements/premium/promotional');
    expect(JSON.parse((opts as { body: string }).body)).toEqual({ duration: 'lifetime' });

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: 'premium', couponCode: 'NS2026' }),
      { merge: true },
    );
  });

  it('normalizes lowercase / padded codes', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: '  ns2026 ' });
    expect(res.status).toBe(200);
  });

  it('rejects a code already redeemed (409) without calling RevenueCat', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({ couponCode: 'NS2026' }) });
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: 'NS2026' });
    expect(res.status).toBe(409);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(db.set).not.toHaveBeenCalled();
  });

  it('rejects an unknown code (404)', async () => {
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: 'NOPE' });
    expect(res.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects a missing code (400)', async () => {
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 503 when the RevenueCat secret is not configured', async () => {
    delete process.env.REVENUECAT_SECRET_API_KEY;
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: 'NS2026' });
    expect(res.status).toBe(503);
    expect(db.set).not.toHaveBeenCalled();
  });

  it('returns 502 when the RevenueCat grant fails', async () => {
    db.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad' });
    const res = await request(app)
      .post('/user/redeem-coupon')
      .set('Authorization', 'Bearer valid-token')
      .send({ code: 'NS2026' });
    expect(res.status).toBe(502);
    expect(db.set).not.toHaveBeenCalled();
  });
});
