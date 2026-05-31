import * as crypto from 'crypto';
import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decrypt, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { weekId as computeWeekId, weekRange } from '../services/weeks';
import {
  buildMiddayPrompt, buildEveningPrompt, buildWeeklyPrompt, buildFreePrompt,
  UserProfile, CoachingStyle, PromptTask, CallPromptContext,
} from '../prompts';

const router = Router();
router.use(authMiddleware);

type CallType = 'midday' | 'evening' | 'weekly' | 'free';

interface Task { id: string; title: string; isCompleted: boolean; completedAt?: string | null; }
interface SessionDoc { date: string; tasks?: string; score?: number | null; }
interface WeekDoc { weekNumber: number; startDate: string; endDate: string; tasks?: string; }
interface UserProfileDoc {
  displayName?: string; bio?: string; coachingStyle?: string; occupation?: string; motivation?: string;
}

const CALL_TYPE_TO_CONVERSATION_TYPE: Record<CallType, string> = {
  midday: 'middayCall', evening: 'eveningCall', weekly: 'weeklyCall', free: 'freeVoice',
};

function todayDateString(): string { return new Date().toISOString().slice(0, 10); }
function daysAgoDateString(n: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10);
}

async function getUserProfile(uid: string): Promise<UserProfile> {
  const doc = await db.collection('users').doc(uid).get();
  const data = doc.exists ? (doc.data() as UserProfileDoc) : {};
  const styleRaw = data.coachingStyle ? await decrypt(data.coachingStyle) : 'balanced';
  const coachingStyle: CoachingStyle =
    styleRaw === 'tough' || styleRaw === 'gentle' ? styleRaw : 'balanced';
  return {
    name: data.displayName ? await decrypt(data.displayName) : '',
    bio: data.bio ? await decrypt(data.bio) : '',
    coachingStyle,
    occupation: data.occupation ? await decrypt(data.occupation) : '',
    motivation: data.motivation ? await decrypt(data.motivation) : '',
  };
}

function toPromptTasks(tasks: Task[]): PromptTask[] {
  return tasks.map((t) => ({ id: t.id, title: t.title, isCompleted: t.isCompleted }));
}

async function getCurrentWeek(uid: string) {
  const id = computeWeekId(uid, new Date());
  const doc = await db.collection('weeks').doc(id).get();
  const range = weekRange(new Date());
  if (!doc.exists) {
    return { weekNumber: range.week, startDate: range.startDate, endDate: range.endDate, tasks: [] as PromptTask[] };
  }
  const data = doc.data() as WeekDoc;
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return {
    weekNumber: data.weekNumber ?? range.week,
    startDate: data.startDate ?? range.startDate,
    endDate: data.endDate ?? range.endDate,
    tasks: toPromptTasks(tasks),
  };
}

async function getTodayTasks(uid: string): Promise<PromptTask[]> {
  const doc = await db.collection('sessions').doc(`${uid}_${todayDateString()}`).get();
  if (!doc.exists) return [];
  const data = doc.data() as SessionDoc;
  const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
  return toPromptTasks(tasks);
}

async function getRecentHistory(uid: string): Promise<string> {
  const from = daysAgoDateString(6);
  const to = todayDateString();
  const snap = await db.collection('sessions')
    .where('userId', '==', uid).where('date', '>=', from).where('date', '<=', to).get();
  const rows = await Promise.all(snap.docs.map(async (d) => {
    const data = d.data() as SessionDoc;
    const tasks = data.tasks ? await decryptJSON<Task[]>(data.tasks) : [];
    const done = tasks.filter((t) => t.isCompleted).length;
    const score = data.score != null ? ` (score: ${data.score}/10)` : '';
    return `${data.date}: ${done}/${tasks.length} tasks completed${score}`;
  }));
  if (rows.length === 0) return 'No recent history.';
  return rows.sort((a, b) => b.localeCompare(a)).join('\n');
}

router.post('/init-call', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { callType } = req.body as { callType?: string };
  if (!callType || !['midday', 'evening', 'weekly', 'free'].includes(callType)) {
    res.status(400).json({ error: 'callType must be "midday", "evening", "weekly", or "free"' });
    return;
  }
  const type = callType as CallType;
  try {
    const [profile, week, todayTasks, recentHistory] = await Promise.all([
      getUserProfile(uid), getCurrentWeek(uid), getTodayTasks(uid), getRecentHistory(uid),
    ]);
    const ctx: CallPromptContext = {
      profile,
      weekTasks: week.tasks, weekNumber: week.weekNumber,
      weekStartDate: week.startDate, weekEndDate: week.endDate,
      todayTasks, recentHistory,
    };
    let systemPrompt: string;
    if (type === 'midday') systemPrompt = buildMiddayPrompt(ctx);
    else if (type === 'evening') systemPrompt = buildEveningPrompt(ctx);
    else if (type === 'weekly') systemPrompt = buildWeeklyPrompt(ctx);
    else systemPrompt = buildFreePrompt(ctx);

    const assistantId = process.env.VAPI_ASSISTANT_ID ?? '';
    if (!assistantId) { res.status(500).json({ error: 'VAPI_ASSISTANT_ID is not configured' }); return; }

    const conversationId = crypto.randomUUID();
    await db.collection('conversations').doc(conversationId).set({
      userId: uid, type: CALL_TYPE_TO_CONVERSATION_TYPE[type],
      messages: await encryptJSON([]), vapiCallId: null, durationSeconds: null,
      createdAt: new Date().toISOString(), summary: await encrypt(''),
    });

    res.json({
      conversationId, assistantId, systemPrompt,
      metadata: { userId: uid, callType: type, conversationId },
    });
  } catch (err) {
    console.error('vapi init-call error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
