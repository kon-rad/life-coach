import * as crypto from 'crypto';
import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decrypt, decryptJSON } from '../services/encryption';
import { createVapiCall } from '../services/vapi';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

type CallType = 'morning' | 'evening' | 'free';

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

interface ProjectDoc {
  title: string;
  description?: string;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function formatHistory(
  sessions: Array<{ date: string; microActions: MicroAction[]; score?: number | null }>,
): string {
  if (sessions.length === 0) return 'No recent history.';
  return sessions
    .map((s) => {
      const completed = s.microActions.filter((a) => a.isCompleted).length;
      const total = s.microActions.length;
      const score = s.score != null ? ` (score: ${s.score}/10)` : '';
      return `${s.date}: ${completed}/${total} actions completed${score}`;
    })
    .join('\n');
}

function formatTodayActions(microActions: MicroAction[]): string {
  if (microActions.length === 0) return 'No micro-actions set for today.';
  return microActions
    .map((a, i) => `${i + 1}. ${a.title} [${a.isCompleted ? 'done' : 'not done'}]`)
    .join('\n');
}

async function getLast7Sessions(
  uid: string,
): Promise<Array<{ date: string; microActions: MicroAction[]; score?: number | null }>> {
  const from = daysAgoDateString(6);
  const to = todayDateString();

  const snapshot = await db
    .collection('sessions')
    .where('userId', '==', uid)
    .where('date', '>=', from)
    .where('date', '<=', to)
    .get();

  const sessions = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data() as SessionDoc;
      const microActions = data.microActions
        ? await decryptJSON<MicroAction[]>(data.microActions, uid)
        : [];
      return { date: data.date, microActions, score: data.score ?? null };
    }),
  );

  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

function buildMorningPrompt(title: string, description: string, history: string): string {
  return (
    `You are a warm, direct life coach. User's project: ${title}. ${description}. ` +
    `Last 7 days:\n${history}\n` +
    `Your job: (1) briefly reflect on recent progress (2) ask how they are feeling ` +
    `(3) help them identify 3 specific micro-actions for today (4) confirm the actions. ` +
    `At the end of the call, output a JSON block: \`\`\`json\n` +
    `{"microActions":[{"id":"uuid","title":"..."},{"id":"uuid","title":"..."},{"id":"uuid","title":"..."}]}\`\`\``
  );
}

function buildEveningPrompt(
  title: string,
  description: string,
  history: string,
  todayActions: string,
): string {
  return (
    `You are a warm, direct life coach. User's project: ${title}. ${description}. ` +
    `Last 7 days:\n${history}\n` +
    `Today's micro-actions:\n${todayActions}\n` +
    `Your job: (1) ask how today went (2) go through each micro-action ` +
    `(3) celebrate wins, acknowledge misses without judgment (4) help plan tomorrow ` +
    `(5) give a score 0-10. At the end output: \`\`\`json\n` +
    `{"completedActionIds":[...],"score":N,"scoreRationale":"...","tomorrowMicroActions":[{"id":"uuid","title":"..."}]}\`\`\``
  );
}

function buildFreePrompt(
  title: string,
  description: string,
  history: string,
  todayActions: string,
): string {
  return (
    `You are a warm, direct, and results-oriented life coach. ` +
    `You are working with an anonymous user (you do not know their name, email, or any identifying information).\n\n` +
    `Their current project: ${title}\nProject description: ${description}\n\n` +
    `Recent progress (last 7 days):\n${history}\n\n` +
    `Today's micro-actions:\n${todayActions}\n\n` +
    `Rules:\n` +
    `- Keep responses under 150 words unless the user asks for detail\n` +
    `- Ask one question at a time\n` +
    `- Do not use filler phrases like "Absolutely!" or "Great question!"\n` +
    `- Be direct and specific — generic advice is useless\n` +
    `- You are a coach, not a therapist; focus on action and accountability`
  );
}

const CALL_TYPE_TO_CONVERSATION_TYPE: Record<CallType, string> = {
  morning: 'morningCall',
  evening: 'eveningCall',
  free: 'freeVoice',
};

const CALL_TYPE_TO_ASSISTANT_ENV: Record<CallType, string> = {
  morning: 'VAPI_ASSISTANT_ID_MORNING',
  evening: 'VAPI_ASSISTANT_ID_EVENING',
  free: 'VAPI_ASSISTANT_ID_FREE',
};

router.post('/init-call', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { callType } = req.body as { callType?: string };

  if (!callType || !['morning', 'evening', 'free'].includes(callType)) {
    res.status(400).json({ error: 'callType must be "morning", "evening", or "free"' });
    return;
  }

  const type = callType as CallType;

  try {
    // Fetch and decrypt project
    const projectDoc = await db.collection('projects').doc(`${uid}_active`).get();
    if (!projectDoc.exists) {
      res.status(404).json({ error: 'No active project found' });
      return;
    }
    const projectData = projectDoc.data() as ProjectDoc;
    const title = await decrypt(projectData.title, uid);
    const description = projectData.description
      ? await decrypt(projectData.description, uid)
      : '';

    // Fetch last 7 sessions for history context
    const sessions = await getLast7Sessions(uid);
    const history = formatHistory(sessions);

    // For evening/free, also fetch today's micro-actions
    let todayActions = '';
    if (type === 'evening' || type === 'free') {
      const today = todayDateString();
      const todayDoc = await db.collection('sessions').doc(`${uid}_${today}`).get();
      if (todayDoc.exists) {
        const sessionData = todayDoc.data() as SessionDoc;
        const microActions = sessionData.microActions
          ? await decryptJSON<MicroAction[]>(sessionData.microActions, uid)
          : [];
        todayActions = formatTodayActions(microActions);
      }
    }

    // Build system prompt
    let systemPrompt: string;
    if (type === 'morning') {
      systemPrompt = buildMorningPrompt(title, description, history);
    } else if (type === 'evening') {
      systemPrompt = buildEveningPrompt(title, description, history, todayActions);
    } else {
      systemPrompt = buildFreePrompt(title, description, history, todayActions);
    }

    const assistantId = process.env[CALL_TYPE_TO_ASSISTANT_ENV[type]] ?? '';

    // Create VAPI call with injected system prompt
    const { vapiCallId, callToken } = await createVapiCall({
      assistantId,
      systemPromptOverride: systemPrompt,
      userId: uid,
    });

    // Create conversation record in Firestore
    const conversationId = crypto.randomUUID();
    const conversationType = CALL_TYPE_TO_CONVERSATION_TYPE[type];

    await db.collection('conversations').doc(conversationId).set({
      userId: uid,
      type: conversationType,
      messages: await encryptJSON([], uid),
      vapiCallId,
      durationSeconds: null,
      createdAt: new Date().toISOString(),
      summary: await encrypt('', uid),
    });

    res.json({
      vapiCallToken: callToken,
      callId: conversationId,
      vapiCallId,
    });
  } catch (err) {
    console.error('vapi init-call error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
