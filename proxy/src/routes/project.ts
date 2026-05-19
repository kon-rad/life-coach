import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { complete } from '../services/togetherAI';

const router = Router();
router.use(authMiddleware);

const projectDocId = (userId: string) => `${userId}_active`;

function generateProjectDescription(title: string, userId: string): void {
  setImmediate(async () => {
    try {
      const prompt = `In 2-3 sentences, describe what working on this goal means and what success looks like: "${title}". Be specific and motivating. Do not use generic language.`;
      const description = await complete(prompt);
      if (!description) return;
      const encryptedDesc = await encrypt(description, userId);
      await db.collection('projects').doc(projectDocId(userId)).update({ description: encryptedDesc });
    } catch {
      // best-effort
    }
  });
}

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  try {
    const doc = await db.collection('projects').doc(projectDocId(uid)).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'No project found' });
      return;
    }

    const data = doc.data()!;
    const title = await decrypt(data.title, uid);
    const description = data.description ? await decrypt(data.description, uid) : '';

    res.json({
      id: doc.id,
      userId: data.userId,
      title,
      description,
      createdAt: data.createdAt,
      isActive: data.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { title, description } = req.body as { title?: string; description?: string };

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const encryptedTitle = await encrypt(title.trim(), uid);
    const encryptedDescription = await encrypt(description ?? '', uid);

    const docData = {
      userId: uid,
      title: encryptedTitle,
      description: encryptedDescription,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    await db.collection('projects').doc(projectDocId(uid)).set(docData);

    // async description generation — do not await
    generateProjectDescription(title.trim(), uid);

    res.status(201).json({
      id: projectDocId(uid),
      userId: uid,
      title: title.trim(),
      description: description ?? '',
      createdAt: docData.createdAt,
      isActive: true,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { title } = req.body as { title?: string };

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const encryptedTitle = await encrypt(title.trim(), uid);
    await db.collection('projects').doc(projectDocId(uid)).update({
      title: encryptedTitle,
    });

    // async description regeneration
    generateProjectDescription(title.trim(), uid);

    res.json({ id: projectDocId(uid), userId: uid, title: title.trim() });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
