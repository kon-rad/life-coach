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
