import { Router } from 'express';

const router = Router();

router.post('/init', (_req, res) => {
  res.json({ success: true });
});

export default router;
