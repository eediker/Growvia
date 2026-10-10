import { describe, expect, it } from 'vitest';
import { guideBlockSchema, richTextParts } from './guides';
import { DemoDatabase } from '../data/offline';

describe('guide catalog and safe structured content', () => {
  it('rejects unsafe media and malformed tables', () => {
    expect(guideBlockSchema.safeParse({ type: 'image', url: 'javascript:alert(1)' }).success).toBe(false);
    expect(guideBlockSchema.safeParse({ type: 'table', headers: [], rows: [] }).success).toBe(false);
    expect(guideBlockSchema.safeParse({ type: 'list', ordered: true, items: ['First', 'Second'] }).success).toBe(true);
  });
  it('renders bold as text and never interprets arbitrary HTML', () => {
    expect(richTextParts('Hello <strong>world</strong><img src=x onerror=alert(1)>&amp;')).toEqual([
      { text: 'Hello ', bold: false }, { text: 'world', bold: true }, { text: '&', bold: false },
    ]);
  });
  it('keeps demo guide categories and pagination consistent with cloud', async () => {
    const storage = new Map<string, string>();
    const gateway = new DemoDatabase({ getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } }, () => crypto.randomUUID()).forPersona('parent');
    expect(await gateway.guideCategories()).toHaveLength(6);
    const first = await gateway.content({ kind: 'guide', categoryId: 'parenting-approach', limit: 1 });
    const second = await gateway.content({ kind: 'guide', categoryId: 'parenting-approach', offset: 1, limit: 1 });
    expect(first.total).toBe(2);
    expect(first.items[0]?.id).toBe('guide-five');
    expect(second.items[0]?.id).toBe('guide-repeat');
    expect((await gateway.content({ kind: 'guide', categoryId: 'daily-life' })).items).toEqual([]);
  });
  it('edits an existing demo child without creating another child or granting teacher access', async () => {
    const storage = new Map<string, string>();
    const database = new DemoDatabase({ getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } }, () => crypto.randomUUID());
    const parent = database.forPersona('parent'), teacher = database.forPersona('teacher');
    const child = (await parent.children())[0]!;
    await parent.updateChild(child.id, { name: ' Ada edited ', dateOfBirth: child.dateOfBirth });
    expect((await parent.children()).map(c => c.name)).toEqual(['Ada edited']);
    await expect(teacher.updateChild(child.id, { name: 'Forbidden', dateOfBirth: child.dateOfBirth })).rejects.toMatchObject({ code: 'notFound' });
    await expect(parent.updateChild(child.id, { name: 'Invalid', dateOfBirth: '2023-02-30' })).rejects.toMatchObject({ code: 'invalid' });
  });
});
