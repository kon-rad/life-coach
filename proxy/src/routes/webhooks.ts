import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { analyzeCall, generateRetrospective, scoreDay, rescoreDay } from '../services/togetherAI';
import { buildMessagesFromCall, VapiArtifactMessage } from '../services/vapiTranscript';
import { handleToolCall } from '../services/vapiTools';
import { weekId, weekRange, weekIdForDate } from '../services/weeks';
import { buildRetrospectivePrompt, buildDayScorePrompt, buildRescorePrompt, PromptTask } from '../prompts';
import { accumulatedUsageUpdate, VoiceUsageDoc } from '../services/voiceUsage';
import { tierForProduct, quotaSecondsForProduct, FREE_QUOTA_SECONDS } from '../services/subscriptionTiers';

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
    recordingUrl?: string;
    artifact?: {
      messages?: VapiArtifactMessage[];
      transcript?: string;
      recordingUrl?: string;
      stereoRecordingUrl?: string;
    };
  };
}

interface RevenueCatWebhookBody {
  event: {
    type: string;
    app_user_id: string;
    product_id?: string;
  };
}

/** Decrypt an encrypted tasks blob into PromptTask[] (id/title/isCompleted), best-effort. */
async function tasksFromDoc(enc: string | null | undefined): Promise<PromptTask[]> {
  if (!enc) return [];
  try {
    const tasks = await decryptJSON<Task[]>(enc);
    return tasks.map((t) => ({ id: t.id, title: t.title, isCompleted: t.isCompleted }));
  } catch {
    return [];
  }
}

/**
 * Re-score past days whose tasks the coach edited during this call. The tools
 * webhook stamped the edited dates onto the conversation as `editedPastDates`;
 * each one that ALREADY has a score gets a fresh score from the corrected task
 * state (summary/advice are deliberately kept). Never-scored days stay unscored —
 * scoring is the evening call's job. Per-day failures are logged and skipped.
 */
async function rescoreEditedPastDays(userId: string, conversationId: string): Promise<void> {
  const convSnap = await db.collection('conversations').doc(conversationId).get();
  if (!convSnap.exists) return;
  const dates = (convSnap.data() as { editedPastDates?: string[] }).editedPastDates ?? [];
  const today = todayDateString();
  for (const date of new Set(dates)) {
    if (typeof date !== 'string' || !date || date >= today) continue;
    try {
      const sessionRef = db.collection('sessions').doc(`${userId}_${date}`);
      const sessionSnap = await sessionRef.get();
      if (!sessionSnap.exists) continue;
      const session = sessionSnap.data() as SessionDoc;
      if (session.score === null || session.score === undefined) continue;

      const dayTasks = await tasksFromDoc(session.tasks);
      const weekSnap = await db.collection('weeks').doc(weekIdForDate(userId, date)).get();
      const weekTasks = weekSnap.exists
        ? await tasksFromDoc((weekSnap.data() as { tasks?: string }).tasks)
        : [];
      const score = await rescoreDay(buildRescorePrompt({ date, weekTasks, dayTasks }));
      await sessionRef.update({ score });
    } catch (e) {
      console.error(`rescore failed for ${userId} ${date}:`, e);
    }
  }
}

/** Add a call's duration to the user's weekly + lifetime voice usage (week-aware). */
async function accumulateVoiceUsage(userId: string, durationSeconds: number): Promise<void> {
  if (!durationSeconds) return;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc?.exists) return;
  const data = (userDoc.data() ?? {}) as VoiceUsageDoc;
  await userRef.update({ ...accumulatedUsageUpdate(userId, data, durationSeconds, new Date()) });
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
  // VAPI hosts the call recording; capture whichever URL it provides (mono preferred,
  // then stereo, then the legacy top-level field). Stored encrypted on the conversation.
  const recordingUrl =
    message.artifact?.recordingUrl ??
    message.artifact?.stereoRecordingUrl ??
    message.recordingUrl ??
    '';

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
      const today = todayDateString();
      const sessionId = `${userId}_${today}`;
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      // Gather scoring context: today's tasks (from the session) + this week's 3 tasks.
      const dayTasks = sessionDoc.exists
        ? await tasksFromDoc((sessionDoc.data() as SessionDoc).tasks)
        : [];
      const weekSnap = await db.collection('weeks').doc(weekId(userId, new Date())).get();
      const weekTasks = weekSnap.exists
        ? await tasksFromDoc((weekSnap.data() as { tasks?: string }).tasks)
        : [];

      // Score the day from the evening transcript (single invocation — the summary is
      // reused for the conversation record below). Llama 3.3 70B, returns score+summary+advice.
      const profile = { name: '', bio: '', coachingStyle: 'balanced' as const, occupation: '', motivation: '' };
      const day = await scoreDay(buildDayScorePrompt({ profile, weekTasks, dayTasks, transcript }));
      callAnalysis = { summary: day.summary, score: day.score, scoreRationale: '' };

      // Persist the day's score, narrative summary, and personalized advice on the session
      // (all encrypted) so the day detail view can show them.
      const encryptedDaySummary = await encrypt(day.summary);
      const encryptedAdvice = await encrypt(day.advice);

      if (sessionDoc.exists) {
        await sessionRef.update({
          eveningCallId: conversationId ?? null,
          score: day.score,
          summary: encryptedDaySummary,
          advice: encryptedAdvice,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          tasks: await encryptJSON([]),
          weekId: weekIdForDate(userId, today),
          middayCallId: null,
          eveningCallId: conversationId ?? null,
          score: day.score,
          summary: encryptedDaySummary,
          advice: encryptedAdvice,
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

    } else if (callType === 'weekly') {
      // On a FIRST-SESSION weekly call there is no prior week to review — set_week_tasks
      // created the CURRENT week (as 'active') during this very call. Marking it
      // 'complete' + generating a retrospective here would instantly "finish" the week
      // the user just planned. The init-call stamps `isFirstSession` on the conversation;
      // read it back and skip the retro in that case so the new week stays active.
      let isFirstSession = false;
      if (conversationId) {
        const convSnap = await db.collection('conversations').doc(conversationId).get();
        if (convSnap.exists) {
          isFirstSession = (convSnap.data() as { isFirstSession?: boolean }).isFirstSession === true;
        }
      }

      if (!isFirstSession) {
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
      }
    } else {
      // free call: analyze once for summary (used in conversation block below)
      callAnalysis = await analyzeCall(transcript, 'free', 'your goals');
    }

    // Voice usage is metered for EVERY call type (midday/evening/weekly/free).
    await accumulateVoiceUsage(userId, durationSeconds ?? 0);

    // If the coach corrected any past day's tasks during this call, rescore those
    // days now (all call types). Best-effort — never fail the webhook on it.
    if (conversationId) {
      try { await rescoreEditedPastDays(userId, conversationId); }
      catch (e) { console.error('rescore edited past days failed', e); }
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
        recordingUrl: await encrypt(recordingUrl),
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
    call?: { metadata?: { userId?: string; conversationId?: string } };
  };
}

interface CoachAction {
  name: string;
  detail: string;
  timestamp: string;
}

/** Human-readable description of a coach tool call, for the conversation actions log. */
function describeToolCall(name: string, args: Record<string, unknown>): string {
  const titles = Array.isArray(args.tasks) ? (args.tasks as unknown[]).map(String) : [];
  switch (name) {
    case 'set_week_tasks':
      return titles.length ? `Set the week's tasks: ${titles.join(', ')}` : "Set the week's tasks";
    case 'set_day_tasks': {
      const date = args.date ? ` for ${String(args.date)}` : '';
      return titles.length ? `Set tasks${date}: ${titles.join(', ')}` : `Set the day's tasks${date}`;
    }
    case 'complete_task':
      return `Marked a task ${args.isCompleted ? 'complete' : 'not complete'}`;
    default:
      return name;
  }
}

/** Append coach actions to a conversation's encrypted actions log (read-modify-write). */
async function appendConversationActions(conversationId: string, actions: CoachAction[]): Promise<void> {
  if (!actions.length) return;
  const ref = db.collection('conversations').doc(conversationId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const enc = (snap.data() as { actions?: string }).actions;
  let existing: CoachAction[] = [];
  if (enc) {
    try { existing = await decryptJSON<CoachAction[]>(enc); } catch { existing = []; }
  }
  await ref.update({ actions: await encryptJSON([...existing, ...actions]) });
}

router.post('/vapi/tools', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const body = req.body as VapiToolCallsBody;
  const message = body?.message;
  if (!message || message.type !== 'tool-calls') { res.json({ received: true }); return; }
  const uid = message.call?.metadata?.userId;
  if (!uid) { res.status(400).json({ error: 'Missing userId in call metadata' }); return; }
  const conversationId = message.call?.metadata?.conversationId;

  const calls = message.toolCallList ?? [];
  const performed: CoachAction[] = [];
  const editedPastDates = new Set<string>();
  const today = todayDateString();
  const results = await Promise.all(calls.map(async (c) => {
    const name = c.function?.name ?? c.name ?? '';
    const rawArgs = c.function?.arguments ?? c.arguments ?? {};
    const args = (typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs) as Record<string, unknown>;
    let result: string;
    try {
      const call = await handleToolCall(uid, name, args);
      result = call.result;
      // A tool edited a PAST day's session — queue it for rescoring at end of call.
      if (call.touchedDate && call.touchedDate < today) editedPastDates.add(call.touchedDate);
      performed.push({ name, detail: describeToolCall(name, args), timestamp: new Date().toISOString() });
    }
    catch (e) { console.error('tool call error', e); result = 'There was an error saving that.'; }
    return { toolCallId: c.id, result };
  }));

  // Record what the coach did against the conversation so the detail view can show it.
  // Best-effort: never fail the tool response on a logging error.
  if (conversationId) {
    try { await appendConversationActions(conversationId, performed); }
    catch (e) { console.error('append conversation actions failed', e); }
    // Plain-date metadata (like `score`) — the end-of-call webhook reads this back
    // to rescore the edited days once the call is over.
    if (editedPastDates.size) {
      try {
        await db.collection('conversations').doc(conversationId).set(
          { editedPastDates: admin.firestore.FieldValue.arrayUnion(...editedPastDates) },
          { merge: true },
        );
      } catch (e) { console.error('record edited past dates failed', e); }
    }
  }

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
      const productId = body.event.product_id;
      await db.collection('users').doc(appUserId).set(
        {
          subscriptionStatus: tierForProduct(productId), // 'standard' | 'premium'
          weeklyVoiceQuotaSeconds: quotaSecondsForProduct(productId),
        },
        { merge: true },
      );
    } else if (FREE_EVENTS.has(eventType)) {
      await db.collection('users').doc(appUserId).set(
        { subscriptionStatus: 'free', weeklyVoiceQuotaSeconds: FREE_QUOTA_SECONDS },
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
