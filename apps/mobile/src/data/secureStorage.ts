import { AppError } from '../domain/models';

export interface SecureKeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
type Manifest = { version: 1; generation: string; count: number };

/** Small OS-keychain entries; commit the manifest last so interrupted refreshes
 * cannot replace a working session. Every chunk remains encrypted by the OS. */
export function chunkedSecureStorage(store: SecureKeyValue, uuid: () => string): SecureKeyValue {
  const readManifest = async (key: string): Promise<Manifest | null> => {
    const raw = await store.getItem(`${key}.manifest`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Manifest;
    if (value.version !== 1 || !/^[\w-]+$/.test(value.generation) || !Number.isInteger(value.count) || value.count < 1 || value.count > 256)
      throw new AppError('storage');
    return value;
  };
  const cleanup = async (key: string, manifest: Manifest | null) => {
    if (!manifest) return;
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.removeItem(`${key}.${manifest.generation}.${i}`)));
  };
  return {
    async getItem(key) {
      const manifest = await readManifest(key);
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => store.getItem(`${key}.${manifest.generation}.${i}`)));
      if (chunks.some(chunk => chunk === null)) throw new AppError('storage');
      return chunks.join('');
    },
    async setItem(key, value) {
      const previous = await readManifest(key);
      const characters = Array.from(value);
      const chunks = Array.from({ length: Math.max(1, Math.ceil(characters.length / 400)) }, (_, i) => characters.slice(i * 400, (i + 1) * 400).join(''));
      if (chunks.length > 256) throw new AppError('storage');
      const next: Manifest = { version: 1, generation: uuid(), count: chunks.length };
      try {
        for (const [index, chunk] of chunks.entries()) await store.setItem(`${key}.${next.generation}.${index}`, chunk);
        await store.setItem(`${key}.manifest`, JSON.stringify(next));
      } catch (cause) {
        await cleanup(key, next).catch(() => undefined);
        throw new AppError('storage', { cause });
      }
      await cleanup(key, previous).catch(() => undefined);
    },
    async removeItem(key) {
      const manifest = await readManifest(key);
      await store.removeItem(`${key}.manifest`);
      await cleanup(key, manifest).catch(() => undefined);
    },
  };
}
