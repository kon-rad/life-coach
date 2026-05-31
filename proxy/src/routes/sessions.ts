import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface Task { id: string; title: string; isCompleted: boolean; completedAt?: string | null; }

interface SessionDoc {
  userId: string;
  date: string;
  tasks: string;
  weekId?: string | null;
  middayCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
}

function emptySession(userId: string, date: string) {
  return {
    id: `${userId}_${date}`, userId, date, tasks: [], weekId: null,
    middayCallId: null, eveningCallId: null, score: null, scoreRationale: null,
  };
}

async function decryptSession(docId: string, data: SessionDoc) {
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  const scoreRationale = data.scoreRationale ? await decrypt(data.scoreRationale) : null;
  return {
    id: docId, userId: data.userId, date: data.date, tasks,
    weekId: data.weekId ?? null,
    middayCallId: data.middayCallId ?? null,
    eveningCallId: data.eveningCallId ?? null,
    score: data.score ?? null, scoreRationale,
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
        decryptSession(doc.id, doc.data() as SessionDoc),
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

    const session = await decryptSession(doc.id, doc.data() as SessionDoc);
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:date/tasks/:taskId/complete', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date, taskId } = req.params;
  const { isCompleted } = req.body as { isCompleted?: boolean };
  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ error: 'isCompleted (boolean) is required' });
    return;
  }
  try {
    const docId = `${uid}_${date}`;
    const doc = await db.collection('sessions').doc(docId).get();
    if (!doc.exists) { res.status(404).json({ error: 'Session not found' }); return; }
    const data = doc.data() as SessionDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }
    tasks[idx].isCompleted = isCompleted;
    tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
    const enc = await encryptJSON(tasks);
    await db.collection('sessions').doc(docId).update({ tasks: enc });
    res.json(await decryptSession(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
