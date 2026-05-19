import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { deleteUserKey } from '../services/keyStore';
import { authMiddleware, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const WEEKLY_VOICE_QUOTA_SECONDS = 3600;

interface NotificationSettings {
  morningReminderHour: number;
  morningReminderMinute: number;
  eveningReminderHour: number;
  eveningReminderMinute: number;
  streakReminders: boolean;
}

interface UserDoc {
  displayName?: string;
  createdAt?: string;
  voiceMinutesUsedThisWeek?: number;
  weeklyVoiceQuotaSeconds?: number;
  totalVoiceSecondsUsed?: number;
  totalChatMessages?: number;
  notificationSettings?: string;
  subscriptionStatus?: string;
  fcmToken?: string;
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
  microActions?: string;
  score?: number | null;
}

function computeStreak(sessionsByDate: Map<string, MicroAction[]>): number {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 31; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const actions = sessionsByDate.get(dateStr);
    if (!actions || !actions.some((a) => a.isCompleted)) {
      break;
    }
    streak++;
  }

  return streak;
}

router.get('/profile', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;

  try {
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const data = doc.data() as UserDoc;
    const displayName = data.displayName ? await decrypt(data.displayName, uid) : '';
    const notificationSettings: NotificationSettings = data.notificationSettings
      ? await decryptJSON<NotificationSettings>(data.notificationSettings, uid)
      : {
          morningReminderHour: 8,
          morningReminderMinute: 0,
          eveningReminderHour: 21,
          eveningReminderMinute: 0,
          streakReminders: true,
        };

    res.json({
      id: uid,
      displayName,
      createdAt: data.createdAt ?? new Date().toISOString(),
      voiceMinutesUsedThisWeek: data.voiceMinutesUsedThisWeek ?? 0,
      weeklyVoiceQuotaSeconds: data.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS,
      totalVoiceSecondsUsed: data.totalVoiceSecondsUsed ?? 0,
      totalChatMessages: data.totalChatMessages ?? 0,
      notificationSettings,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { displayName, notificationSettings, fcmToken } = req.body as {
    displayName?: string;
    notificationSettings?: NotificationSettings;
    fcmToken?: string;
  };

  try {
    const update: Record<string, unknown> = {};

    if (displayName !== undefined) {
      update.displayName = await encrypt(displayName, uid);
    }
    if (notificationSettings !== undefined) {
      update.notificationSettings = await encryptJSON(notificationSettings, uid);
    }
    if (fcmToken !== undefined) {
      update.fcmToken = fcmToken;
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    await db.collection('users').doc(uid).set(update, { merge: true });
    res.json({ updated: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', uid)
      .where('date', '>=', fromDate)
      .where('date', '<=', toDate)
      .get();

    const sessionsByDate = new Map<string, MicroAction[]>();
    let totalMicroActionsDone = 0;
    let totalDaysComplete = 0;
    const scores: number[] = [];

    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as SessionDoc;
        const microActions: MicroAction[] = data.microActions
          ? await decryptJSON<MicroAction[]>(data.microActions, uid)
          : [];

        sessionsByDate.set(data.date, microActions);

        const completedCount = microActions.filter((a) => a.isCompleted).length;
        totalMicroActionsDone += completedCount;

        if (microActions.length > 0 && completedCount === microActions.length) {
          totalDaysComplete++;
        }

        if (data.score != null) {
          scores.push(data.score);
        }
      }),
    );

    const currentStreak = computeStreak(sessionsByDate);
    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? (userDoc.data() as UserDoc) : {};
    const totalVoiceSecondsUsed = userData.totalVoiceSecondsUsed ?? 0;
    const totalChatMessages = userData.totalChatMessages ?? 0;
    const voiceMinutesUsedThisWeek = userData.voiceMinutesUsedThisWeek ?? 0;
    const weeklyQuota = userData.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS;
    const voiceMinutesRemainingThisWeek = Math.max(0, weeklyQuota - voiceMinutesUsedThisWeek);

    res.json({
      currentStreak,
      totalDaysComplete,
      totalMicroActionsDone,
      totalVoiceSecondsUsed,
      totalChatMessages,
      averageScore,
      voiceMinutesRemainingThisWeek,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;

  try {
    const batch = db.batch();

    const sessionsSnap = await db.collection('sessions').where('userId', '==', uid).get();
    for (const doc of sessionsSnap.docs) {
      batch.delete(doc.ref);
    }

    const convsSnap = await db.collection('conversations').where('userId', '==', uid).get();
    for (const doc of convsSnap.docs) {
      batch.delete(doc.ref);
    }

    batch.delete(db.collection('projects').doc(`${uid}_active`));
    batch.delete(db.collection('users').doc(uid));

    await batch.commit();
    await deleteUserKey(uid);

    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
