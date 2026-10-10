import { describe, expect, it } from 'vitest';
import { PrototypeStore } from './prototype';

function fixture() {
  const data = new Map<string, string>();
  const storage = { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); } };
  return { storage, store: new PrototypeStore(storage) };
}
describe('explicit offline prototype records', () => {
  it('preserves concurrent writes, isolates children and survives recreation', async () => {
    const { store, storage } = fixture();
    await Promise.all([
      store.addMedication({ id: '1', childId: 'ada', name: 'Demo A', time: '14:00', note: '' }),
      store.addMedication({ id: '2', childId: 'efe', name: 'Demo B', time: '15:00', note: '' }),
    ]);
    const restored = new PrototypeStore(storage);
    expect((await restored.medications('ada')).map(row => row.id)).toEqual(['1']);
    expect((await restored.medications('efe')).map(row => row.id)).toEqual(['2']);
    await expect(store.addMedication({ id: '3', childId: 'ada', name: 'Demo', time: '25:90', note: '' })).rejects.toMatchObject({ code: 'medicationInvalid' });
  });
  it('scopes story reads to a child and resets all prototype data', async () => {
    const { store } = fixture();
    await store.markRead('ada', 'story-1');
    expect(await store.hasRead('ada', 'story-1')).toBe(true);
    expect(await store.hasRead('efe', 'story-1')).toBe(false);
    await store.addMedication({ id: '1', childId: 'ada', name: 'Demo', time: '14:00', note: '' });
    await store.reset();
    expect(await store.hasRead('ada', 'story-1')).toBe(false);
    expect(await store.medications('ada')).toEqual([]);
  });
  it('surfaces storage failures instead of reporting a successful save', async () => {
    const store = new PrototypeStore({ getItem: async () => null, setItem: async () => { throw new Error('disk full'); } });
    await expect(store.markRead('ada', 'story-1')).rejects.toMatchObject({ code: 'storage' });
  });
});
