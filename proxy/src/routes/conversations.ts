import { Router, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { encryptJSON, decryptJSON, encrypt, decrypt } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

type ConversationType = 'middayCall' | 'eveningCall' | 'weeklyCall' | 'freeChat' | 'freeVoice';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// A coaching action taken during a voice call (e.g. set this week's tasks, marked a task done).
// Recorded by the /vapi/tools webhook so the conversation detail can show what the coach did.
interface CoachAction {
  name: string;
  detail: string;
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
  // Encrypted VAPI recording URL (ciphertext of the playback URL). Per docs/app-store-metadata
  // privacy note, the audio itself is hosted by VAPI; we only encrypt the pointer to it.
  recordingUrl?: string | null;
  // Encrypted JSON of CoachAction[].
  actions?: string | null;
}

// Conversation types the iOS client can create directly (voice-call types are created
// server-side by /vapi/init-call, not here).
const VALID_TYPES: ConversationType[] = ['freeChat', 'freeVoice'];

router.get('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  // Optional day window: `from`/`to` are ISO timestamps filtering by createdAt
  // (from <= createdAt < to). Used by the day detail to list that day's calls.
  const { from, to } = req.query as { from?: string; to?: string };

  try {
    let query = db.collection('conversations').where('userId', '==', uid);
    if (from && to) {
      query = query.where('createdAt', '>=', from).where('createdAt', '<', to);
    }
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const conversations = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as ConversationDoc;
        const summary = data.summary ? await decrypt(data.summary) : '';
        // Message bodies are omitted from the list payload (fetched on open),
        // but we decrypt just to return an accurate count for the list UI.
        let messageCount = 0;
        if (data.messages) {
          try {
            messageCount = (await decryptJSON<Message[]>(data.messages)).length;
          } catch {
            // unreadable conversation -> count stays 0
          }
        }
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          messages: [],
          messageCount,
          vapiCallId: data.vapiCallId ?? null,
          durationSeconds: data.durationSeconds ?? null,
          createdAt: data.createdAt,
          summary,
        };
      }),
    );

    res.json(conversations);
  } catch (err) {
    // e.g. missing composite index (userId + createdAt) or a summary that fails to
    // decrypt — either way, log it so the empty Conversations view is diagnosable.
    console.error('[GET /conversations] failed:', err);
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
    const encryptedMessages = await encryptJSON([]);
    const encryptedSummary = await encrypt('');

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
      ? await decryptJSON<Message[]>(data.messages)
      : [];
    const summary = data.summary ? await decrypt(data.summary) : '';
    const recordingUrl = data.recordingUrl ? await decrypt(data.recordingUrl) : '';
    let actions: CoachAction[] = [];
    if (data.actions) {
      try {
        actions = await decryptJSON<CoachAction[]>(data.actions);
      } catch {
        // unreadable actions blob -> return none rather than failing the whole detail
      }
    }

    res.json({
      id: doc.id,
      userId: data.userId,
      type: data.type,
      messages,
      vapiCallId: data.vapiCallId ?? null,
      durationSeconds: data.durationSeconds ?? null,
      createdAt: data.createdAt,
      summary,
      recordingUrl,
      actions,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
