import { Router, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { weekIdForDate } from '../services/weeks';

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
  summary?: string | null;
  advice?: string | null;
}

function emptySession(userId: string, date: string) {
  return {
    id: `${userId}_${date}`, userId, date, tasks: [], weekId: null,
    middayCallId: null, eveningCallId: null, score: null, scoreRationale: null,
    summary: null, advice: null,
  };
}

async function decryptSession(docId: string, data: SessionDoc) {
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  const scoreRationale = data.scoreRationale ? await decrypt(data.scoreRationale) : null;
  const summary = data.summary ? await decrypt(data.summary) : null;
  const advice = data.advice ? await decrypt(data.advice) : null;
  return {
    id: docId, userId: data.userId, date: data.date, tasks,
    weekId: data.weekId ?? null,
    middayCallId: data.middayCallId ?? null,
    eveningCallId: data.eveningCallId ?? null,
    score: data.score ?? null, scoreRationale, summary, advice,
  };
}

/** Build a fresh, empty encrypted session doc for a date (used when a write hits no doc yet). */
async function newSessionDoc(userId: string, date: string): Promise<SessionDoc> {
  return {
    userId, date, tasks: await encryptJSON([]),
    weekId: weekIdForDate(userId, date),
    middayCallId: null, eveningCallId: null, score: null,
    scoreRationale: null, summary: null, advice: null,
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

// Add a day task. Creates the session doc if it does not exist yet.
router.post('/:date/tasks', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date } = req.params;
  const { title } = req.body as { title?: string };
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title (non-empty string) is required' });
    return;
  }
  try {
    const docId = `${uid}_${date}`;
    const ref = db.collection('sessions').doc(docId);
    const doc = await ref.get();
    const data = doc.exists ? (doc.data() as SessionDoc) : await newSessionDoc(uid, date);
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    tasks.push({ id: crypto.randomUUID(), title: title.trim(), isCompleted: false, completedAt: null });
    const enc = await encryptJSON(tasks);
    await ref.set({ ...data, tasks: enc });
    res.status(201).json(await decryptSession(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit a day task: rename and/or toggle completion.
router.put('/:date/tasks/:taskId', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date, taskId } = req.params;
  const { title, isCompleted } = req.body as { title?: string; isCompleted?: boolean };
  if (title === undefined && isCompleted === undefined) {
    res.status(400).json({ error: 'title or isCompleted is required' });
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
    if (typeof title === 'string' && title.trim()) tasks[idx].title = title.trim();
    if (typeof isCompleted === 'boolean') {
      tasks[idx].isCompleted = isCompleted;
      tasks[idx].completedAt = isCompleted ? new Date().toISOString() : null;
    }
    const enc = await encryptJSON(tasks);
    await db.collection('sessions').doc(docId).update({ tasks: enc });
    res.json(await decryptSession(docId, { ...data, tasks: enc }));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a day task.
router.delete('/:date/tasks/:taskId', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { date, taskId } = req.params;
  try {
    const docId = `${uid}_${date}`;
    const doc = await db.collection('sessions').doc(docId).get();
    if (!doc.exists) { res.status(404).json({ error: 'Session not found' }); return; }
    const data = doc.data() as SessionDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const remaining = tasks.filter((t) => t.id !== taskId);
    if (remaining.length === tasks.length) { res.status(404).json({ error: 'Task not found' }); return; }
    const enc = await encryptJSON(remaining);
    await db.collection('sessions').doc(docId).update({ tasks: enc });
    res.json(await decryptSession(docId, { ...data, tasks: enc }));
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
