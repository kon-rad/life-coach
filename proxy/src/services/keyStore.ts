import * as crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function getMasterKey(): Buffer {
  return Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex');
}

export async function initTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_keys (
      user_id TEXT PRIMARY KEY,
      encrypted_key BYTEA NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function generateAndStoreKey(userId: string): Promise<void> {
  const userKey = crypto.randomBytes(32);
  const masterKey = getMasterKey();

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(userKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedKey = Buffer.concat([iv, ciphertext, authTag]);

  await pool.query(
    'INSERT INTO user_keys (user_id, encrypted_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, encryptedKey]
  );
}

export async function getUserKey(userId: string): Promise<Buffer | null> {
  const result = await pool.query(
    'SELECT encrypted_key FROM user_keys WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;

  const masterKey = getMasterKey();
  const encryptedKey = result.rows[0].encrypted_key as Buffer;

  const iv = encryptedKey.slice(0, 12);
  const ciphertext = encryptedKey.slice(12, encryptedKey.length - 16);
  const authTag = encryptedKey.slice(encryptedKey.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function deleteUserKey(userId: string): Promise<void> {
  await pool.query('DELETE FROM user_keys WHERE user_id = $1', [userId]);
}
