import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

interface Task { id: string; title: string; isCompleted: boolean; completedAt: string | null; }
interface WeekDoc {
  userId: string; weekNumber: number; year: number;
  startDate: string; endDate: string; tasks: string;
  status: string; retrospectiveId: string | null; createdAt: string;
}

async function decryptWeek(docId: string, data: WeekDoc) {
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return {
    id: docId, userId: data.userId, weekNumber: data.weekNumber, year: data.year,
    startDate: data.startDate, endDate: data.endDate, tasks,
    status: data.status, retrospectiveId: data.retrospectiveId ?? null, createdAt: data.createdAt,
  };
}

// GET /weeks  -> all weeks for the user, newest first
router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  try {
    const snapshot = await db
      .collection('weeks')
      .where('userId', '==', uid)
      .orderBy('startDate', 'desc')
      .get();
    const weeks = await Promise.all(
      snapshot.docs.map((d) => decryptWeek(d.id, d.data() as WeekDoc)),
    );
    res.json(weeks);
  } catch (err) {
    // Most likely a missing Firestore composite index (userId + startDate); without
    // logging this returns a silent 500 and the Tasks view just shows empty.
    console.error('[GET /weeks] failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /weeks/:weekKey/tasks/:taskId/complete  (weekKey = "2026-W23")
router.put('/:weekKey/tasks/:taskId/complete', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { weekKey, taskId } = req.params;
  const { isCompleted } = req.body as { isCompleted?: boolean };
  if (typeof isCompleted !== 'boolean') {
    res.status(400).json({ error: 'isCompleted (boolean) is required' });
    return;
  }
  try {
    const docId = `${uid}_${weekKey}`;
    const ref = db.collection('weeks').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) { res.status(404).json({ error: 'Week not found' }); return; }
    const data = doc.data() as WeekDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }
    tasks[idx].isCompleted = isCompleted;
    tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
    const enc = await encryptJSON(tasks);
    await ref.update({ tasks: enc });
    res.json(await decryptWeek(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
