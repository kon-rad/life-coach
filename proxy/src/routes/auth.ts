import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/init', authMiddleware, async (_req, res) => {
  res.json({ success: true });
});

export default router;
