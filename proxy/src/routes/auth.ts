import { Router } from 'express';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();

async function stubGetUserKey(_userId: string): Promise<null> {
  return null;
}

router.post('/init', authMiddleware, async (req, res) => {
  const { uid } = req as AuthedRequest;
  const existingKey = await stubGetUserKey(uid);
  if (!existingKey) {
    console.log(`would generate key for user ${uid}`);
  }
  res.json({ success: true });
});

export default router;
