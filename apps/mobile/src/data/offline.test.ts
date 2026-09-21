import { describe, expect, it, vi } from 'vitest';
const randomUUID = () => globalThis.crypto.randomUUID();
import { DemoDatabase, demoChildId, demoClassId } from './offline';

function fixture() {
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } };
  const db = new DemoDatabase(storage, randomUUID);
  return { db, storage, parent: db.forPersona('parent'), teacher: db.forPersona('teacher') };
}

describe('serverless demo', () => {
  it('completes the teacher-to-parent flow without network access and persists after recreation', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disabled'));
    try {
      const { teacher, parent, storage } = fixture();
      const input = { id: randomUUID(), activityId: 'activity-colors', message: 'Today we found blue objects.', language: 'en' as const };
      await teacher.shareActivity(demoClassId, input);
      const post = (await parent.posts(demoClassId)).items.find(p => p.id === input.id)!;
      const activity = await parent.contentById(post.activityId);
      const id = randomUUID();
      await parent.complete(demoChildId, activity.id, id);
      const reloaded = new DemoDatabase(storage, randomUUID).forPersona('parent');
      expect((await reloaded.completions(demoChildId)).some(c => c.id === id)).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it('keeps retries idempotent while preserving repeat activities', async () => {
    const { parent } = fixture();
    const id = randomUUID();
    await Promise.all([parent.complete(demoChildId, 'activity-colors', id), parent.complete(demoChildId, 'activity-colors', id)]);
    await parent.complete(demoChildId, 'activity-colors', randomUUID());
    expect(await parent.completions(demoChildId)).toHaveLength(2);
    await expect(parent.complete(demoChildId, 'activity-leaves', id)).rejects.toMatchObject({ code: 'conflict' });
    await parent.removeCompletion(demoChildId, id);
    expect(await parent.completions(demoChildId)).toHaveLength(1);
  });
  it('enforces persona and class boundaries', async () => {
    const { parent, teacher } = fixture();
    await expect(parent.shareActivity(demoClassId, { id: randomUUID(), activityId: 'activity-colors', message: 'Hello', language: 'en' })).rejects.toMatchObject({ code: 'notFound' });
    await expect(teacher.completions(demoChildId)).rejects.toMatchObject({ code: 'notFound' });
    await expect(parent.posts(randomUUID())).rejects.toMatchObject({ code: 'notFound' });
    expect(await teacher.children()).toEqual([]);
  });
  it('resets all demo mutations and remains usable', async () => {
    const { db, parent } = fixture();
    await parent.complete(demoChildId, 'activity-colors', randomUUID());
    await db.reset();
    expect(await parent.completions(demoChildId)).toEqual([]);
    expect(await parent.children()).toHaveLength(1);
  });
  it('does not acknowledge a write if storage fails', async () => {
    const { parent, storage } = fixture();
    await parent.children();
    storage.setItem = async () => { throw new Error('Disk full'); };
    await expect(parent.complete(demoChildId, 'activity-colors', randomUUID())).rejects.toMatchObject({ code: 'storage' });
    expect(await parent.completions(demoChildId)).toEqual([]);
  });
  it('filters before pagination', async () => {
    const { parent } = fixture();
    const page = await parent.content({ kind: 'activity', ageMonths: 12, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
    expect(page.items[0]!.minAgeMonths).toBe(12);
  });
});
