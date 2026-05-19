import request from 'supertest';
import express from 'express';

jest.mock('../services/firebase', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test123' }),
  },
  db: {},
}));

import { authMiddleware, AuthedRequest } from '../middleware/auth';

const testApp = express();
testApp.use(express.json());
testApp.get('/health', authMiddleware, (req, res) => {
  res.json({ uid: (req as AuthedRequest).uid });
});

describe('Auth middleware', () => {
  it('sets req.uid when a valid Bearer token is provided', async () => {
    const res = await request(testApp)
      .get('/health')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.uid).toBe('test123');
  });

  it('returns 401 when no Authorization header is present', async () => {
    const res = await request(testApp).get('/health');
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is malformed', async () => {
    const res = await request(testApp)
      .get('/health')
      .set('Authorization', 'invalid-format');
    expect(res.status).toBe(401);
  });
});
