import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountJson, 'base64').toString('utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

export const adminAuth = admin.auth();
export const db = admin.firestore();
export const messaging = admin.messaging();

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string
): Promise<void> {
  await messaging.send({ token: fcmToken, notification: { title, body } });
}
