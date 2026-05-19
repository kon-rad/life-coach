import * as crypto from 'crypto';
import { getUserKey } from './keyStore';

// Format: base64(iv[12] + ciphertext + authTag[16])

export async function encrypt(plaintext: string, userId: string): Promise<string> {
  const key = await getUserKey(userId);
  if (!key) throw new Error(`No encryption key found for user ${userId}`);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

export async function decrypt(ciphertext: string, userId: string): Promise<string> {
  const key = await getUserKey(userId);
  if (!key) throw new Error(`No encryption key found for user ${userId}`);

  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12, combined.length - 16);
  const authTag = combined.slice(combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export async function encryptJSON(obj: unknown, userId: string): Promise<string> {
  return encrypt(JSON.stringify(obj), userId);
}

export async function decryptJSON<T>(ciphertext: string, userId: string): Promise<T> {
  const plaintext = await decrypt(ciphertext, userId);
  return JSON.parse(plaintext) as T;
}
