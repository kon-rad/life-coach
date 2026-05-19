import * as cron from 'node-cron';
import { db, sendPushNotification } from './firebase';

interface UserDoc {
  fcmToken?: string;
}

async function sendBulkNotification(title: string, body: string): Promise<void> {
  try {
    const snapshot = await db.collection('users').where('fcmToken', '!=', null).get();
    const sends = snapshot.docs
      .map((doc) => (doc.data() as UserDoc).fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0)
      .map((token) => sendPushNotification(token, title, body).catch(() => {}));
    await Promise.all(sends);
  } catch {
    // Scheduler errors should not crash the server
  }
}

export function startScheduler(): void {
  // Morning check-in reminder at 8:00 AM daily
  cron.schedule('0 8 * * *', () => {
    void sendBulkNotification(
      'Good morning! 🌅',
      'Time for your morning check-in with your AI coach.'
    );
  });

  // Evening check-in reminder at 9:00 PM daily
  cron.schedule('0 21 * * *', () => {
    void sendBulkNotification(
      'Evening check-in time 🌙',
      'Reflect on today and plan tomorrow with your AI coach.'
    );
  });
}
