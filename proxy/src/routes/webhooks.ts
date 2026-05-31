import { Router, Request, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { analyzeCall, generateRetrospective } from '../services/togetherAI';
import { buildMessagesFromCall, VapiArtifactMessage } from '../services/vapiTranscript';
import { handleToolCall } from '../services/vapiTools';
import { weekId, weekRange, weekIdForDate } from '../services/weeks';
import { buildRetrospectivePrompt } from '../prompts';

const router = Router();

function verifyVapiSecret(req: Request): boolean {
  const secret = req.headers['x-vapi-secret'];
  return !!process.env.VAPI_WEBHOOK_SECRET && secret === process.env.VAPI_WEBHOOK_SECRET;
}

function verifyRevenueCatSecret(req: Request): boolean {
  const auth = req.headers['authorization'];
  return (
    !!process.env.REVENUECAT_WEBHOOK_SECRET &&
    auth === `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`
  );
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
}

interface SessionDoc {
  userId: string;
  date: string;
  tasks?: string;
  weekId?: string | null;
  middayCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
}

// VAPI end-of-call-report webhook format
interface VapiCallMetadata {
  userId?: string;
  callType?: string;
  conversationId?: string;
}

interface VapiEndOfCallReport {
  message: {
    type: string;
    call: {
      id: string;
      metadata?: VapiCallMetadata;
    };
    transcript?: string;
    durationSeconds?: number;
    messages?: VapiArtifactMessage[];
    artifact?: {
      messages?: VapiArtifactMessage[];
      transcript?: string;
    };
  };
}

interface RevenueCatWebhookBody {
  event: {
    type: string;
    app_user_id: string;
  };
}

router.post('/vapi', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as VapiEndOfCallReport;
  const message = body?.message;

  if (!message || message.type !== 'end-of-call-report') {
    // Acknowledge other VAPI event types silently
    res.json({ received: true });
    return;
  }

  const metadata = message.call?.metadata ?? {};
  const userId = metadata.userId;
  const callType = metadata.callType as 'midday' | 'evening' | 'weekly' | 'free' | undefined;
  const conversationId = metadata.conversationId;
  const transcript = message.transcript ?? message.artifact?.transcript ?? '';
  const durationSeconds = message.durationSeconds ?? null;
  const artifactMessages = message.artifact?.messages ?? message.messages;

  if (!userId || !callType) {
    console.error('vapi webhook: missing userId or callType in metadata');
    res.status(400).json({ error: 'Missing userId or callType in call metadata' });
    return;
  }

  // analysis is computed at most once per call; reused for both session writes and conversation summary
  let callAnalysis: { summary: string; score: number; scoreRationale: string } | null = null;

  try {
    if (callType === 'midday') {
      // Tasks were set live via tool calls — just persist conversation (handled below)
      callAnalysis = await analyzeCall(transcript, 'midday', 'your goals');
    } else if (callType === 'evening') {
      // Analyze the call for score (single invocation — reused for summary below)
      callAnalysis = await analyzeCall(transcript, 'evening', 'your goals');

      const today = todayDateString();
      const sessionId = `${userId}_${today}`;
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      const encryptedScoreRationale = await encrypt(callAnalysis.scoreRationale);

      if (sessionDoc.exists) {
        await sessionRef.update({
          eveningCallId: conversationId ?? null,
          score: callAnalysis.score,
          scoreRationale: encryptedScoreRationale,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          tasks: await encryptJSON([]),
          weekId: weekIdForDate(userId, today),
          middayCallId: null,
          eveningCallId: conversationId ?? null,
          score: callAnalysis.score,
          scoreRationale: encryptedScoreRationale,
        });
      }

      // Set up tomorrow's session skeleton if not existing
      const tomorrow = tomorrowDateString();
      const tomorrowRef = db.collection('sessions').doc(`${userId}_${tomorrow}`);
      const tomorrowDoc = await tomorrowRef.get();
      if (!tomorrowDoc.exists) {
        await tomorrowRef.set({
          userId,
          date: tomorrow,
          tasks: await encryptJSON([]),
          weekId: weekIdForDate(userId, tomorrow),
          middayCallId: null,
          eveningCallId: null,
          score: null,
          scoreRationale: null,
        });
      }

      // Update voice usage
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data() as { totalVoiceSecondsUsed?: number; voiceMinutesUsedThisWeek?: number };
        await userRef.update({
          totalVoiceSecondsUsed: (userData.totalVoiceSecondsUsed ?? 0) + (durationSeconds ?? 0),
          voiceMinutesUsedThisWeek: (userData.voiceMinutesUsedThisWeek ?? 0) + (durationSeconds ?? 0),
        });
      }
    } else if (callType === 'weekly') {
      const range = weekRange(new Date());
      const weekDocId = weekId(userId, new Date());
      const weekRef = db.collection('weeks').doc(weekDocId);
      const weekSnap = await weekRef.get();

      let weekTasks: Array<{ id: string; title: string; isCompleted: boolean }> = [];
      if (weekSnap.exists) {
        const wd = weekSnap.data() as { tasks?: string };
        if (wd.tasks) weekTasks = await decryptJSON(wd.tasks);
        await weekRef.update({ status: 'complete' });
      }

      const profile = { name: '', bio: '', coachingStyle: 'balanced' as const, occupation: '', motivation: '' };
      const prompt = buildRetrospectivePrompt({
        profile, weekNumber: range.week, weekStartDate: range.startDate, weekEndDate: range.endDate,
        weekTasks: weekTasks.map((t) => ({ id: t.id, title: t.title, isCompleted: t.isCompleted })),
        dailyBreakdown: 'See conversations.', conversationDigest: transcript,
      });
      const report = await generateRetrospective(prompt);

      const retroId = `${userId}_${range.year}-W${String(range.week).padStart(2, '0')}`;
      await db.collection('retrospectives').doc(retroId).set({
        userId, weekId: weekDocId, weekNumber: range.week, year: range.year,
        startDate: range.startDate, endDate: range.endDate,
        wentWell: await encrypt(report.wentWell), improve: await encrypt(report.improve),
        onePercent: await encrypt(report.onePercent), summary: await encrypt(report.summary),
        createdAt: new Date().toISOString(),
      });
      if (weekSnap.exists) await weekRef.update({ retrospectiveId: retroId });
    } else {
      // free call: analyze once for summary (used in conversation block below)
      callAnalysis = await analyzeCall(transcript, 'free', 'your goals');
    }

    // Update conversation record with summary (non-weekly only)
    if (conversationId) {
      let summary = '';
      if (callType !== 'weekly' && callAnalysis) {
        summary = callAnalysis.summary;
      }
      const encryptedSummary = await encrypt(summary);
      const callMessages = buildMessagesFromCall(
        artifactMessages,
        transcript,
        new Date().toISOString(),
      );
      const encryptedMessages = await encryptJSON(callMessages);
      await db.collection('conversations').doc(conversationId).update({
        messages: encryptedMessages,
        summary: encryptedSummary,
        durationSeconds,
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('vapi webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface VapiToolCallsBody {
  message: {
    type: string;
    toolCallList?: Array<{ id: string; name?: string; function?: { name: string; arguments: unknown }; arguments?: unknown }>;
    call?: { metadata?: { userId?: string } };
  };
}

router.post('/vapi/tools', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const body = req.body as VapiToolCallsBody;
  const message = body?.message;
  if (!message || message.type !== 'tool-calls') { res.json({ received: true }); return; }
  const uid = message.call?.metadata?.userId;
  if (!uid) { res.status(400).json({ error: 'Missing userId in call metadata' }); return; }

  const calls = message.toolCallList ?? [];
  const results = await Promise.all(calls.map(async (c) => {
    const name = c.function?.name ?? c.name ?? '';
    const rawArgs = c.function?.arguments ?? c.arguments ?? {};
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
    let result: string;
    try { result = await handleToolCall(uid, name, args as Record<string, unknown>); }
    catch (e) { console.error('tool call error', e); result = 'There was an error saving that.'; }
    return { toolCallId: c.id, result };
  }));
  res.json({ results });
});

const PREMIUM_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION']);
const FREE_EVENTS = new Set(['EXPIRATION', 'CANCELLATION']);

router.post('/revenuecat', async (req: Request, res: Response) => {
  if (!verifyRevenueCatSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as RevenueCatWebhookBody;
  const eventType = body?.event?.type;
  const appUserId = body?.event?.app_user_id;

  if (!eventType || !appUserId) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  try {
    if (PREMIUM_EVENTS.has(eventType)) {
      await db.collection('users').doc(appUserId).set(
        { subscriptionStatus: 'premium' },
        { merge: true },
      );
    } else if (FREE_EVENTS.has(eventType)) {
      await db.collection('users').doc(appUserId).set(
        { subscriptionStatus: 'free' },
        { merge: true },
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('revenuecat webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
