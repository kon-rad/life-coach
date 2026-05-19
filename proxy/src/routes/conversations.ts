import { Router, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { encryptJSON, decryptJSON, encrypt, decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

type ConversationType = 'morningCall' | 'eveningCall' | 'freeChat' | 'freeVoice';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationDoc {
  userId: string;
  type: string;
  messages: string;
  vapiCallId?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
  summary?: string | null;
}

const VALID_TYPES: ConversationType[] = ['morningCall', 'eveningCall', 'freeChat', 'freeVoice'];

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;

  try {
    const snapshot = await db
      .collection('conversations')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const conversations = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as ConversationDoc;
        const summary = data.summary ? await decrypt(data.summary, uid) : '';
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          messages: [],
          vapiCallId: data.vapiCallId ?? null,
          durationSeconds: data.durationSeconds ?? null,
          createdAt: data.createdAt,
          summary,
        };
      }),
    );

    res.json(conversations);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { type } = req.body as { type?: string };

  if (!type || !VALID_TYPES.includes(type as ConversationType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const encryptedMessages = await encryptJSON([], uid);
    const encryptedSummary = await encrypt('', uid);

    const doc: ConversationDoc = {
      userId: uid,
      type,
      messages: encryptedMessages,
      createdAt,
      summary: encryptedSummary,
      vapiCallId: null,
      durationSeconds: null,
    };

    await db.collection('conversations').doc(id).set(doc);

    res.status(201).json({
      id,
      userId: uid,
      type,
      messages: [],
      vapiCallId: null,
      durationSeconds: null,
      createdAt,
      summary: '',
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res: Response) => {
  const uid = (req as unknown as AuthedRequest).uid;
  const { id } = req.params;

  try {
    const doc = await db.collection('conversations').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const data = doc.data() as ConversationDoc;
    if (data.userId !== uid) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const messages: Message[] = data.messages
      ? await decryptJSON<Message[]>(data.messages, uid)
      : [];
    const summary = data.summary ? await decrypt(data.summary, uid) : '';

    res.json({
      id: doc.id,
      userId: data.userId,
      type: data.type,
      messages,
      vapiCallId: data.vapiCallId ?? null,
      durationSeconds: data.durationSeconds ?? null,
      createdAt: data.createdAt,
      summary,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
