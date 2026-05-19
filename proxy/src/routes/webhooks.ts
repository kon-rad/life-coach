import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../services/firebase';
import { encrypt, encryptJSON, decryptJSON } from '../services/encryption';

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

interface RawMicroAction {
  id?: string;
  title: string;
}

interface MicroAction {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
}

interface VapiMorningStructuredOutput {
  microActions: RawMicroAction[];
}

interface VapiEveningStructuredOutput {
  completedActionIds: string[];
  score: number;
  scoreRationale: string;
  tomorrowMicroActions: RawMicroAction[];
}

interface VapiWebhookBody {
  event: string;
  callId: string;
  userId: string;
  callType: 'morning' | 'evening' | 'free';
  transcript: string;
  structuredOutput?: VapiMorningStructuredOutput | VapiEveningStructuredOutput;
  durationSeconds?: number;
}

interface RevenueCatWebhookBody {
  event: {
    type: string;
    app_user_id: string;
  };
}

interface SessionDoc {
  userId: string;
  date: string;
  microActions?: string;
  morningCallId?: string | null;
  eveningCallId?: string | null;
  score?: number | null;
  scoreRationale?: string | null;
  tomorrowMicroActions?: string | null;
}

interface UserDoc {
  totalVoiceSecondsUsed?: number;
  voiceMinutesUsedThisWeek?: number;
}

async function findConversationByVapiCallId(
  userId: string,
  vapiCallId: string,
): Promise<string | null> {
  const snapshot = await db
    .collection('conversations')
    .where('userId', '==', userId)
    .where('vapiCallId', '==', vapiCallId)
    .limit(1)
    .get();
  return snapshot.docs[0]?.id ?? null;
}

router.post('/vapi', async (req: Request, res: Response) => {
  if (!verifyVapiSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as VapiWebhookBody;
  const { callId, userId, callType, transcript, structuredOutput, durationSeconds } = body;

  if (!userId || !callType) {
    res.status(400).json({ error: 'userId and callType are required' });
    return;
  }

  try {
    if (callType === 'morning') {
      const output = structuredOutput as VapiMorningStructuredOutput | undefined;
      const microActions: MicroAction[] = (output?.microActions ?? []).map((a) => ({
        id: a.id ?? crypto.randomUUID(),
        title: a.title,
        isCompleted: false,
        completedAt: null,
      }));

      const today = todayDateString();
      const sessionId = `${userId}_${today}`;

      const conversationId = await findConversationByVapiCallId(userId, callId);

      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      const encryptedMicroActions = await encryptJSON(microActions, userId);

      if (sessionDoc.exists) {
        await sessionRef.update({
          microActions: encryptedMicroActions,
          morningCallId: conversationId,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          microActions: encryptedMicroActions,
          morningCallId: conversationId,
          eveningCallId: null,
          score: null,
          scoreRationale: null,
          tomorrowMicroActions: null,
        });
      }

      if (conversationId) {
        const encryptedMessages = await encryptJSON(
          [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: transcript || '',
              timestamp: new Date().toISOString(),
            },
          ],
          userId,
        );
        await db.collection('conversations').doc(conversationId).update({
          messages: encryptedMessages,
          durationSeconds: durationSeconds ?? null,
        });
      }
    } else if (callType === 'evening') {
      const output = structuredOutput as VapiEveningStructuredOutput | undefined;
      const completedActionIds: string[] = output?.completedActionIds ?? [];
      const score: number | null = output?.score ?? null;
      const scoreRationale: string = output?.scoreRationale ?? '';
      const tomorrowRaw: RawMicroAction[] = output?.tomorrowMicroActions ?? [];

      const tomorrowMicroActions: MicroAction[] = tomorrowRaw.map((a) => ({
        id: a.id ?? crypto.randomUUID(),
        title: a.title,
        isCompleted: false,
        completedAt: null,
      }));

      const today = todayDateString();
      const tomorrow = tomorrowDateString();
      const sessionId = `${userId}_${today}`;

      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      let existingMicroActions: MicroAction[] = [];
      if (sessionDoc.exists) {
        const data = sessionDoc.data() as SessionDoc;
        if (data.microActions) {
          existingMicroActions = await decryptJSON<MicroAction[]>(data.microActions, userId);
        }
      }

      const now = new Date().toISOString();
      const updatedMicroActions = existingMicroActions.map((a) => ({
        ...a,
        isCompleted: completedActionIds.includes(a.id) ? true : a.isCompleted,
        completedAt:
          completedActionIds.includes(a.id) && !a.isCompleted ? now : a.completedAt,
      }));

      const conversationId = await findConversationByVapiCallId(userId, callId);
      const encryptedMicroActions = await encryptJSON(updatedMicroActions, userId);
      const encryptedScoreRationale = await encrypt(scoreRationale, userId);
      const encryptedTomorrowActions = await encryptJSON(tomorrowMicroActions, userId);

      if (sessionDoc.exists) {
        await sessionRef.update({
          microActions: encryptedMicroActions,
          score,
          scoreRationale: encryptedScoreRationale,
          eveningCallId: conversationId,
        });
      } else {
        await sessionRef.set({
          userId,
          date: today,
          microActions: encryptedMicroActions,
          morningCallId: null,
          eveningCallId: conversationId,
          score,
          scoreRationale: encryptedScoreRationale,
          tomorrowMicroActions: null,
        });
      }

      const tomorrowSessionId = `${userId}_${tomorrow}`;
      const tomorrowRef = db.collection('sessions').doc(tomorrowSessionId);
      const tomorrowDoc = await tomorrowRef.get();

      if (tomorrowDoc.exists) {
        await tomorrowRef.update({ tomorrowMicroActions: encryptedTomorrowActions });
      } else {
        await tomorrowRef.set({
          userId,
          date: tomorrow,
          microActions: await encryptJSON([], userId),
          morningCallId: null,
          eveningCallId: null,
          score: null,
          scoreRationale: null,
          tomorrowMicroActions: encryptedTomorrowActions,
        });
      }

      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserDoc;
        const prevTotal = userData.totalVoiceSecondsUsed ?? 0;
        const prevWeek = userData.voiceMinutesUsedThisWeek ?? 0;
        const seconds = durationSeconds ?? 0;
        await userRef.update({
          totalVoiceSecondsUsed: prevTotal + seconds,
          voiceMinutesUsedThisWeek: prevWeek + seconds,
        });
      }

      if (conversationId) {
        const encryptedMessages = await encryptJSON(
          [
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: transcript || '',
              timestamp: new Date().toISOString(),
            },
          ],
          userId,
        );
        await db.collection('conversations').doc(conversationId).update({
          messages: encryptedMessages,
          durationSeconds: durationSeconds ?? null,
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('vapi webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
