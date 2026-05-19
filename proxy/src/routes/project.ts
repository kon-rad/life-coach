import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const projectDocId = (userId: string) => `${userId}_active`;

async function generateProjectDescription(title: string, userId: string): Promise<void> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) return;

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          {
            role: 'user',
            content: `In 2-3 sentences, describe what it means to work on this goal and what success looks like: ${title}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return;

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const description = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!description) return;

    const encryptedDescription = await encrypt(description, userId);
    await db.collection('projects').doc(projectDocId(userId)).update({
      description: encryptedDescription,
    });
  } catch {
    // best-effort; caller is not awaiting
  }
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
