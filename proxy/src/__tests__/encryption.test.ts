process.env.MASTER_ENCRYPTION_KEY = 'a'.repeat(64);

import { encrypt, decrypt, encryptJSON, decryptJSON } from '../services/encryption';

describe('Encryption service', () => {
  it('round-trips a string', async () => {
    const plaintext = 'hello world';
    const ciphertext = await encrypt(plaintext);
    const result = await decrypt(ciphertext);
    expect(result).toBe(plaintext);
  });

  it('round-trips a JSON object', async () => {
    const obj = { name: 'Alice', value: 42, nested: { ok: true } };
    const ciphertext = await encryptJSON(obj);
    const result = await decryptJSON<typeof obj>(ciphertext);
    expect(result).toEqual(obj);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const plaintext = 'same plaintext';
    const c1 = await encrypt(plaintext);
    const c2 = await encrypt(plaintext);
    expect(c1).not.toBe(c2);
  });
});
