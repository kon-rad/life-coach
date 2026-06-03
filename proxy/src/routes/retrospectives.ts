import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface RetroDoc {
  userId: string; weekId: string; weekNumber: number; year: number;
  startDate: string; endDate: string;
  wentWell: string; improve: string; onePercent: string; summary: string; createdAt: string;
}

async function decryptRetro(docId: string, d: RetroDoc) {
  return {
    id: docId, weekId: d.weekId, weekNumber: d.weekNumber, year: d.year,
    startDate: d.startDate, endDate: d.endDate,
    wentWell: d.wentWell ? await decrypt(d.wentWell) : '',
    improve: d.improve ? await decrypt(d.improve) : '',
    onePercent: d.onePercent ? await decrypt(d.onePercent) : '',
    summary: d.summary ? await decrypt(d.summary) : '',
    createdAt: d.createdAt,
  };
}

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  try {
    const snapshot = await db
      .collection('retrospectives')
      .where('userId', '==', uid)
      .orderBy('startDate', 'desc')
      .get();
    const retros = await Promise.all(
      snapshot.docs.map((d) => decryptRetro(d.id, d.data() as RetroDoc)),
    );
    res.json(retros);
  } catch (err) {
    // Most likely a missing Firestore composite index (userId + startDate).
    console.error('[GET /retrospectives] failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
