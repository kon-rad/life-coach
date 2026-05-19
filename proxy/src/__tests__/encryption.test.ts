process.env.MASTER_ENCRYPTION_KEY = '0'.repeat(64);

const TEST_KEY = Buffer.from('a'.repeat(64), 'hex');

jest.mock('../services/keyStore', () => ({
  getUserKey: jest.fn().mockResolvedValue(Buffer.from('a'.repeat(64), 'hex')),
  generateAndStoreKey: jest.fn(),
  deleteUserKey: jest.fn(),
  initTable: jest.fn(),
}));

import { encrypt, decrypt, encryptJSON, decryptJSON } from '../services/encryption';

describe('Encryption service', () => {
  const userId = 'test-user';

  it('round-trips a string', async () => {
    const plaintext = 'hello world';
    const ciphertext = await encrypt(plaintext, userId);
    const result = await decrypt(ciphertext, userId);
    expect(result).toBe(plaintext);
  });

  it('round-trips a JSON object', async () => {
    const obj = { name: 'Alice', value: 42, nested: { ok: true } };
    const ciphertext = await encryptJSON(obj, userId);
    const result = await decryptJSON<typeof obj>(ciphertext, userId);
    expect(result).toEqual(obj);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const plaintext = 'same plaintext';
    const c1 = await encrypt(plaintext, userId);
    const c2 = await encrypt(plaintext, userId);
    expect(c1).not.toBe(c2);
  });

  it('throws when no key exists for user', async () => {
    const { getUserKey } = require('../services/keyStore');
    (getUserKey as jest.Mock).mockResolvedValueOnce(null);
    await expect(encrypt('test', 'no-key-user')).rejects.toThrow('No encryption key found');
  });
});
