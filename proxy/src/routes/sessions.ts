import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface MicroAction {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

interface SessionDoc {
  userId: string;
  date: string;
  microActions: string;
  tomorrowMicroActions?: string | null;
  morningCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
}

function emptySession(userId: string, date: string) {
  return {
    id: `${userId}_${date}`,
    userId,
    date,
    microActions: [],
    morningCallId: null,
    eveningCallId: null,
    score: null,
    scoreRationale: null,
    tomorrowMicroActions: null,
  };
}

async function decryptSession(docId: string, data: SessionDoc, uid: string) {
  const microActions = data.microActions
    ? await decryptJSON<MicroAction[]>(data.microActions, uid)
    : [];
  const tomorrowMicroActions = data.tomorrowMicroActions
    ? await decryptJSON<MicroAction[]>(data.tomorrowMicroActions, uid)
    : null;
  const scoreRationale = data.scoreRationale
    ? await decrypt(data.scoreRationale, uid)
    : null;

  return {
    id: docId,
    userId: data.userId,
    date: data.date,
    microActions,
    tomorrowMicroActions,
    morningCallId: data.morningCallId ?? null,
    eveningCallId: data.eveningCallId ?? null,
    score: data.score ?? null,
    scoreRationale,
  };
}

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { from, to } = req.query as { from?: string; to?: string };

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query parameters are required' });
    return;
  }

  try {
    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', uid)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .get();

    const sessions = await Promise.all(
      snapshot.docs.map((doc) =>
        decryptSession(doc.id, doc.data() as SessionDoc, uid),
      ),
    );

    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:date', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date } = req.params;

  try {
    const docId = `${uid}_${date}`;
    const doc = await db.collection('sessions').doc(docId).get();

    if (!doc.exists) {
      res.json(emptySession(uid, date));
      return;
    }

    const session = await decryptSession(doc.id, doc.data() as SessionDoc, uid);
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:date/microactions/:actionId/complete', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date, actionId } = req.params;
  const { isCompleted } = req.body as { isCompleted?: boolean };

  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ error: 'isCompleted (boolean) is required' });
    return;
  }

  try {
    const docId = `${uid}_${date}`;
    const doc = await db.collection('sessions').doc(docId).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const data = doc.data() as SessionDoc;
    const microActions = data.microActions
      ? await decryptJSON<MicroAction[]>(data.microActions, uid)
      : [];

    const idx = microActions.findIndex((a) => a.id === actionId);
    if (idx === -1) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    microActions[idx].isCompleted = isCompleted;
    microActions[idx].completedAt = isCompleted ? new Date().toISOString() : null;

    const encryptedMicroActions = await encryptJSON(microActions, uid);
    await db.collection('sessions').doc(docId).update({ microActions: encryptedMicroActions });

    const updated = await decryptSession(docId, { ...data, microActions: encryptedMicroActions }, uid);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
