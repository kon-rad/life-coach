import * as cron from 'node-cron';
import { db, sendPushNotification } from './firebase';
import { usersDueAt, REMINDER_COPY, ReminderUser, ReminderSettings } from './reminders';

const TICK_WINDOW_MINUTES = 5;

interface UserDoc {
  fcmToken?: string;
  notificationSettings?: ReminderSettings;
}

async function loadReminderUsers(): Promise<ReminderUser[]> {
  const snap = await db.collection('users').get();
  const users: ReminderUser[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as UserDoc;
    if (!data.fcmToken || !data.notificationSettings) continue;
    users.push({ uid: doc.id, fcmToken: data.fcmToken, settings: data.notificationSettings });
  }
  return users;
}

export async function runReminderTick(now: Date = new Date()): Promise<void> {
  try {
    const users = await loadReminderUsers();
    const due = usersDueAt(users, now, TICK_WINDOW_MINUTES);
    await Promise.all(
      due.map((d) => {
        const copy = REMINDER_COPY[d.kind];
        return sendPushNotification(d.fcmToken, copy.title, copy.body).catch(() => {});
      }),
    );
  } catch {
    // never crash the server from the scheduler
  }
}

export function startScheduler(): void {
  // Every 5 minutes; TICK_WINDOW_MINUTES must match the cron cadence.
  cron.schedule('*/5 * * * *', () => { void runReminderTick(); });
}
