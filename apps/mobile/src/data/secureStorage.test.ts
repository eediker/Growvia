import { expect, it } from 'vitest';
import { chunkedSecureStorage } from './secureStorage';

it('round-trips large Unicode sessions in bounded keychain entries', async () => {
  const entries = new Map<string, string>();
  const storage = chunkedSecureStorage({ getItem: async k => entries.get(k) ?? null,
    setItem: async (k, v) => { expect(new TextEncoder().encode(v).length).toBeLessThan(2048); entries.set(k, v); },
    removeItem: async k => { entries.delete(k); } }, () => crypto.randomUUID());
  const value = '🌱Türkçe'.repeat(2000);
  await storage.setItem('auth', value);
  expect(await storage.getItem('auth')).toBe(value);
  await storage.removeItem('auth');
  expect(entries.size).toBe(0);
});

it('preserves the previous session when a refresh cannot be completely saved', async () => {
  const entries = new Map<string, string>();
  let fail = false;
  const storage = chunkedSecureStorage({ getItem: async k => entries.get(k) ?? null,
    setItem: async (k, v) => { if (fail && k.endsWith('.1')) throw new Error('Keychain full'); entries.set(k, v); },
    removeItem: async k => { entries.delete(k); } }, () => crypto.randomUUID());
  await storage.setItem('auth', 'working session');
  fail = true;
  await expect(storage.setItem('auth', 'x'.repeat(900))).rejects.toMatchObject({ code: 'storage' });
  expect(await storage.getItem('auth')).toBe('working session');
});
