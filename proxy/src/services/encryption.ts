import * as crypto from 'crypto';

function getMasterKey(): Buffer {
  return Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex');
}

// Format: base64(iv[12] + ciphertext + authTag[16])

export async function encrypt(plaintext: string): Promise<string> {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = getMasterKey();
  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12, combined.length - 16);
  const authTag = combined.slice(combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export async function encryptJSON(obj: unknown): Promise<string> {
  return encrypt(JSON.stringify(obj));
}

export async function decryptJSON<T>(ciphertext: string): Promise<T> {
  const plaintext = await decrypt(ciphertext);
  return JSON.parse(plaintext) as T;
}
