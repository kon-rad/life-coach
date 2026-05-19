import { Router } from 'express';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { generateAndStoreKey } from '../services/keyStore';

const router = Router();

router.post('/init', authMiddleware, async (req, res) => {
  const { uid } = req as AuthedRequest;
  try {
    await generateAndStoreKey(uid);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to init user key:', err);
    res.status(500).json({ error: 'Failed to initialize user' });
  }
});

export default router;
