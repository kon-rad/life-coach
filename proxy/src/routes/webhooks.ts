import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decrypt, decryptJSON } from '../services/encryption';
import { analyzeCall } from '../services/togetherAI';
import { buildMessagesFromCall, VapiArtifactMessage } from '../services/vapiTranscript';
import { handleToolCall } from '../services/vapiTools';

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

interface MicroAction {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
}

interface SessionDoc {
  userId: string;
  date: string;
  microActions?: string;
  morningCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
}

interface ProjectDoc {
  title: string;
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

  try {
    // Fetch project title for context in LLM analysis
    let projectTitle = 'Unknown project';
    try {
      const projectDoc = await db.collection('projects').doc(`${userId}_active`).get();
      if (projectDoc.exists) {
        const projectData = projectDoc.data() as ProjectDoc;
        projectTitle = await decrypt(projectData.title);
      }
    } catch {
      // Non-fatal — analysis will still run without full context
    }

    // Analyze the transcript with Together AI
    const analysis = await analyzeCall(transcript, callType, projectTitle);

    const today = todayDateString();
    const sessionId = `${userId}_${today}`;
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (callType === 'midday') {
      const microActions: MicroAction[] = (analysis.microActions ?? []).map((a) => ({
        id: a.id || crypto.randomUUID(),
        title: a.title,
        isCompleted: false,
        completedAt: null,
      }));

      const encryptedMicroActions = await encryptJSON(microActions);
      const encryptedScoreRationale = await encrypt(analysis.scoreRationale);

      if (sessionDoc.exists) {
        await sessionRef.update({
          microActions: encryptedMicroActions,
          morningCallId: conversationId ?? null,
          score: analysis.score,
          scoreRationale: encryptedScoreRationale,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          microActions: encryptedMicroActions,
          morningCallId: conversationId ?? null,
          eveningCallId: null,
          score: analysis.score,
          scoreRationale: encryptedScoreRationale,
          tomorrowMicroActions: null,
        });
      }
    } else if (callType === 'evening') {
      // For evening calls: update today's session with score
      let existingMicroActions: MicroAction[] = [];
      if (sessionDoc.exists) {
        const data = sessionDoc.data() as SessionDoc;
        if (data.microActions) {
          existingMicroActions = await decryptJSON<MicroAction[]>(data.microActions);
        }
      }

      const encryptedMicroActions = await encryptJSON(existingMicroActions);
      const encryptedScoreRationale = await encrypt(analysis.scoreRationale);

      if (sessionDoc.exists) {
        await sessionRef.update({
          eveningCallId: conversationId ?? null,
          score: analysis.score,
          scoreRationale: encryptedScoreRationale,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          microActions: encryptedMicroActions,
          morningCallId: null,
          eveningCallId: conversationId ?? null,
          score: analysis.score,
          scoreRationale: encryptedScoreRationale,
          tomorrowMicroActions: null,
        });
      }

      // Also set up tomorrow's session skeleton
      const tomorrow = tomorrowDateString();
      const tomorrowRef = db.collection('sessions').doc(`${userId}_${tomorrow}`);
      const tomorrowDoc = await tomorrowRef.get();
      if (!tomorrowDoc.exists) {
        await tomorrowRef.set({
          userId,
          date: tomorrow,
          microActions: await encryptJSON([]),
          morningCallId: null,
          eveningCallId: null,
          score: null,
          scoreRationale: null,
          tomorrowMicroActions: null,
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
    } else {
      // free call: just save score + summary, no session impact
    }

    // Update the conversation record with the summary and duration
    if (conversationId) {
      const encryptedSummary = await encrypt(analysis.summary);
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
