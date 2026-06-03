import { Router, Response } from 'express';
import { db } from '../services/firebase';
import { encrypt, decrypt, encryptJSON, decryptJSON } from '../services/encryption';
import { authMiddleware, AuthedRequest } from '../middleware/auth';
import { usedSecondsThisWeek } from '../services/voiceUsage';

const router = Router();
router.use(authMiddleware);

const WEEKLY_VOICE_QUOTA_SECONDS = 3600;

interface NotificationSettings {
  middayReminderHour: number;
  middayReminderMinute: number;
  eveningReminderHour: number;
  eveningReminderMinute: number;
  weeklyPlanningWeekday: number;
  weeklyPlanningHour: number;
  weeklyPlanningMinute: number;
  timeZone: string;
  streakReminders: boolean;
}

type CoachingStyle = 'tough' | 'balanced' | 'gentle';
const COACHING_STYLES: readonly CoachingStyle[] = ['tough', 'balanced', 'gentle'];

interface UserDoc {
  displayName?: string;
  bio?: string;
  coachingStyle?: string;
  occupation?: string;
  motivation?: string;
  createdAt?: string;
  /** Seconds of voice used in the current ISO week (was misnamed voiceMinutesUsedThisWeek). */
  voiceSecondsUsedThisWeek?: number;
  /** Legacy field — held seconds despite the name; read as fallback for old docs. */
  voiceMinutesUsedThisWeek?: number;
  /** ISO weekId stamp; a stale stamp means this-week usage is effectively 0. */
  usageWeekId?: string;
  weeklyVoiceQuotaSeconds?: number;
  totalVoiceSecondsUsed?: number;
  totalChatMessages?: number;
  notificationSettings?: string;
  subscriptionStatus?: string;
  couponCode?: string;
  couponRedeemedAt?: string;
  fcmToken?: string;
}

// Promo codes that grant a permanent Premium subscription. Each account may
// redeem one coupon; afterwards the premium status simply persists.
const COUPON_CODES = new Set(['NS2026']);

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
    const displayName = data.displayName ? await decrypt(data.displayName) : '';
    const bio = data.bio ? await decrypt(data.bio) : '';
    const coachingStyle = data.coachingStyle ? await decrypt(data.coachingStyle) : 'balanced';
    const occupation = data.occupation ? await decrypt(data.occupation) : '';
    const motivation = data.motivation ? await decrypt(data.motivation) : '';
    // Always return a COMPLETE notificationSettings object. A user created before a field
    // was added (e.g. weeklyPlanning*/timeZone/middayReminder*) has a stored object missing
    // those keys; returning it verbatim makes the iOS client — which decodes every key as
    // non-optional — fail to decode the WHOLE profile ("The data couldn't be read"). Merge
    // any stored values over the defaults so every key is guaranteed present.
    const defaultNotificationSettings: NotificationSettings = {
      middayReminderHour: 11,
      middayReminderMinute: 30,
      eveningReminderHour: 20,
      eveningReminderMinute: 0,
      weeklyPlanningWeekday: 0,
      weeklyPlanningHour: 19,
      weeklyPlanningMinute: 0,
      timeZone: 'UTC',
      streakReminders: true,
    };
    const storedNotificationSettings = data.notificationSettings
      ? await decryptJSON<Partial<NotificationSettings>>(data.notificationSettings)
      : {};
    const notificationSettings: NotificationSettings = {
      ...defaultNotificationSettings,
      ...storedNotificationSettings,
    };

    res.json({
      id: uid,
      displayName,
      bio,
      coachingStyle,
      occupation,
      motivation,
      createdAt: data.createdAt ?? new Date().toISOString(),
      // `usedSecondsThisWeek` already rounds; round the lifetime total too. The iOS client
      // decodes both as `Int`, and any fractional value (VAPI durations are fractional and
      // older docs stored them un-rounded) fails the whole decode.
      voiceSecondsUsedThisWeek: usedSecondsThisWeek(uid, data, new Date()),
      weeklyVoiceQuotaSeconds: data.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS,
      totalVoiceSecondsUsed: Math.round(data.totalVoiceSecondsUsed ?? 0),
      totalChatMessages: data.totalChatMessages ?? 0,
      notificationSettings,
      // Server-authoritative subscription grant (e.g. redeemed coupons). The client
      // uses this so access works even when the RevenueCat entitlement isn't reflected
      // on-device (sandbox, relaunch, or logIn timing).
      subscriptionStatus: data.subscriptionStatus ?? 'free',
    });
  } catch (err) {
    console.error('[GET /user/profile] failed for uid', uid, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { displayName, bio, coachingStyle, occupation, motivation, notificationSettings, fcmToken } =
    req.body as {
      displayName?: string;
      bio?: string;
      coachingStyle?: string;
      occupation?: string;
      motivation?: string;
      notificationSettings?: NotificationSettings;
      fcmToken?: string;
    };

  if (coachingStyle !== undefined && !COACHING_STYLES.includes(coachingStyle as CoachingStyle)) {
    res.status(400).json({ error: 'coachingStyle must be "tough", "balanced", or "gentle"' });
    return;
  }

  try {
    const update: Record<string, unknown> = {};

    if (displayName !== undefined) {
      update.displayName = await encrypt(displayName);
    }
    if (bio !== undefined) {
      update.bio = await encrypt(bio.slice(0, 300));
    }
    if (coachingStyle !== undefined) {
      update.coachingStyle = await encrypt(coachingStyle);
    }
    if (occupation !== undefined) {
      update.occupation = await encrypt(occupation.slice(0, 120));
    }
    if (motivation !== undefined) {
      update.motivation = await encrypt(motivation.slice(0, 300));
    }
    if (notificationSettings !== undefined) {
      update.notificationSettings = await encryptJSON(notificationSettings);
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
          ? await decryptJSON<MicroAction[]>(data.microActions)
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
    // Round — iOS decodes totalVoiceSecondsUsed as `Int`; a fractional value (VAPI durations)
    // would fail the whole /stats decode.
    const totalVoiceSecondsUsed = Math.round(userData.totalVoiceSecondsUsed ?? 0);
    const totalChatMessages = userData.totalChatMessages ?? 0;
    const voiceSecondsUsedThisWeek = usedSecondsThisWeek(uid, userData, new Date());
    const weeklyQuota = userData.weeklyVoiceQuotaSeconds ?? WEEKLY_VOICE_QUOTA_SECONDS;
    const remainingSeconds = Math.max(0, weeklyQuota - voiceSecondsUsedThisWeek);
    const voiceMinutesRemainingThisWeek = Math.floor(remainingSeconds / 60);

    res.json({
      currentStreak,
      totalDaysComplete,
      totalMicroActionsDone,
      totalVoiceSecondsUsed,
      totalChatMessages,
      averageScore,
      voiceSecondsUsedThisWeek,
      weeklyVoiceQuotaSeconds: weeklyQuota,
      voiceMinutesRemainingThisWeek,
    });
  } catch (err) {
    console.error('[GET /user/stats] failed for uid', uid, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grants a permanent Premium subscription by issuing a RevenueCat promotional
// "lifetime" entitlement to the user's RevenueCat account (== Firebase UID via
// Purchases.logIn). One code per account; the entitlement then flows through the
// app's existing RevenueCat-driven premium logic.
const RC_ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID ?? 'premium';

async function grantRevenueCatPromo(uid: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) {
    console.error('[redeem-coupon] REVENUECAT_SECRET_API_KEY is not configured');
    return { ok: false, status: 503 };
  }
  const url =
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}` +
    `/entitlements/${encodeURIComponent(RC_ENTITLEMENT_ID)}/promotional`;
  const rcRes = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration: 'lifetime' }),
  });
  if (!rcRes.ok) {
    console.error('[redeem-coupon] RevenueCat grant failed', rcRes.status, await rcRes.text());
    return { ok: false, status: 502 };
  }
  return { ok: true };
}

router.post('/redeem-coupon', async (req, res: Response) => {
  const uid = (req as AuthedRequest).uid;
  const { code } = req.body as { code?: string };
  const normalized = (code ?? '').trim().toUpperCase();

  if (!normalized) {
    res.status(400).json({ error: 'A code is required' });
    return;
  }
  if (!COUPON_CODES.has(normalized)) {
    res.status(404).json({ error: 'That code is not valid' });
    return;
  }

  try {
    const ref = db.collection('users').doc(uid);
    const doc = await ref.get();
    const data = doc.exists ? (doc.data() as UserDoc) : {};

    // One coupon per account — once redeemed, the premium status just stays.
    if (data.couponCode) {
      res.status(409).json({ error: 'A code has already been redeemed on this account' });
      return;
    }

    const grant = await grantRevenueCatPromo(uid);
    if (!grant.ok) {
      const msg = grant.status === 503
        ? 'Redemption is temporarily unavailable'
        : 'Could not activate your subscription. Please try again.';
      res.status(grant.status).json({ error: msg });
      return;
    }

    // Record the one-time redemption + reflect server-side (gates text chat).
    await ref.set(
      {
        subscriptionStatus: 'premium',
        couponCode: normalized,
        couponRedeemedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    res.json({ status: 'premium' });
  } catch (err) {
    console.error('[POST /user/redeem-coupon] failed for uid', uid, err);
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
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
