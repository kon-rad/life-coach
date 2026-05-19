import { Router, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { streamChat, TogetherMessage } from '../services/togetherAI';

const router = Router();
router.use(authMiddleware);

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
  score?: number | null;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getLast7DaysSessions(
  uid: string,
): Promise<Array<{ date: string; score: number | null; microActions: MicroAction[] }>> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 6);

  try {
    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', uid)
      .where('date', '>=', formatDate(fromDate))
      .where('date', '<=', formatDate(toDate))
      .get();

    return Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as SessionDoc;
        const microActions = data.microActions
          ? await decryptJSON<MicroAction[]>(data.microActions, uid)
          : [];
        return { date: data.date, score: data.score ?? null, microActions };
      }),
    );
  } catch {
    return [];
  }
}

function buildSystemPrompt(
  projectTitle: string,
  projectDescription: string,
  sessions: Array<{ date: string; score: number | null; microActions: MicroAction[] }>,
  todayMicroActions: MicroAction[],
): string {
  const sessionHistory = sessions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const completed = s.microActions.filter((a) => a.isCompleted).length;
      const total = s.microActions.length;
      const scoreStr = s.score != null ? `, score: ${s.score}/10` : '';
      return `${s.date}: ${completed}/${total} actions completed${scoreStr}`;
    })
    .join('\n');

  const actionsStr = todayMicroActions
    .map((a) => `- [${a.isCompleted ? 'x' : ' '}] ${a.title}`)
    .join('\n');

  return `You are a warm, direct, and results-oriented life coach. You are working with an anonymous user (you do not know their name, email, or any identifying information).

Their current project: ${projectTitle}
Project description: ${projectDescription}

Recent progress (last 7 days):
${sessionHistory || 'No recent sessions.'}

Today's micro-actions:
${actionsStr || 'None set yet.'}

Rules:
- Keep responses under 150 words unless the user asks for detail
- Ask one question at a time
- Do not use filler phrases like "Absolutely!" or "Great question!"
- Be direct and specific — generic advice is useless
- You are a coach, not a therapist; focus on action and accountability`;
}

router.post('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { conversationId, message } = req.body as {
    conversationId?: string;
    message?: string;
  };

  if (!conversationId || !message) {
    res.status(400).json({ error: 'conversationId and message are required' });
    return;
  }

  try {
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convDoc.exists) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const convData = convDoc.data() as ConversationDoc;
    if (convData.userId !== uid) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const existingMessages: Message[] = convData.messages
      ? await decryptJSON<Message[]>(convData.messages, uid)
      : [];

    let projectTitle = '';
    let projectDescription = '';
    try {
      const projectDoc = await db.collection('projects').doc(`${uid}_active`).get();
      if (projectDoc.exists) {
        const pData = projectDoc.data()!;
        projectTitle = await decrypt(pData.title as string, uid);
        projectDescription = pData.description
          ? await decrypt(pData.description as string, uid)
          : '';
      }
    } catch {
      // best-effort
    }

    const sessions = await getLast7DaysSessions(uid);
    const today = formatDate(new Date());
    const todayMicroActions = sessions.find((s) => s.date === today)?.microActions ?? [];

    const systemPrompt = buildSystemPrompt(
      projectTitle,
      projectDescription,
      sessions,
      todayMicroActions,
    );

    const recentHistory = existingMessages.slice(-20);
    const togetherMessages: TogetherMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let assistantText = '';
    await streamChat(togetherMessages, (delta) => {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      assistantText += delta;
    });

    const now = new Date().toISOString();
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const updatedMessages: Message[] = [
      ...existingMessages,
      { id: userMsgId, role: 'user', content: message, timestamp: now },
      { id: assistantMsgId, role: 'assistant', content: assistantText, timestamp: now },
    ];

    await db
      .collection('conversations')
      .doc(conversationId)
      .update({ messages: await encryptJSON(updatedMessages, uid) });

    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsgId })}\n\n`);
    res.end();
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

export default router;
