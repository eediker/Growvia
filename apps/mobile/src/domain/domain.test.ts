import { describe, expect, it } from 'vitest';
const randomUUID = () => globalThis.crypto.randomUUID();
import { ageInMonths, recommend, validateChild } from './models';
import { DemoDatabase, demoChildId } from '../data/offline';
import { resources } from '../i18n/resources';

const now = new Date('2026-09-17T12:00:00Z');
const database = () => {
  const data = new Map<string, string>();
  return new DemoDatabase({ getItem: async k => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); } }, randomUUID, () => now);
};

describe('age rules and recommendations', () => {
  it('calculates month boundaries and rejects impossible dates', () => {
    expect(ageInMonths('2025-09-18', now)).toBe(11);
    expect(ageInMonths('2025-09-17', now)).toBe(12);
    expect(ageInMonths('2023-02-30', now)).toBeNull();
    expect(() => validateChild({ name: 'Ada', dateOfBirth: '2025-09-18' }, now)).toThrow();
    expect(() => validateChild({ name: 'Ada', dateOfBirth: '2018-09-17' }, now)).toThrow();
    expect(validateChild({ name: ' Ada ', dateOfBirth: '2018-09-18' }, now).name).toBe('Ada');
  });
  it('never recommends unsuitable content when there are no matches', async () => {
    const api = database().forPersona('parent');
    const all = await api.content();
    expect(recommend(all.items, { id: demoChildId, name: 'Baby', dateOfBirth: '2026-01-01' }, [], now)).toBeUndefined();
    expect(recommend(all.items, undefined, [], now)).toBeUndefined();
  });
  it('prefers untried content and disregards another child’s history', async () => {
    const api = database().forPersona('parent');
    const child = (await api.children())[0]!;
    const content = (await api.content()).items;
    const first = recommend(content, child, [], now)!;
    const history = [{ id: randomUUID(), childId: child.id, activityId: first.id, completedAt: now.toISOString() }];
    expect(recommend(content, child, history, now)?.id).not.toBe(first.id);
    expect(recommend(content, child, history.map(c => ({ ...c, childId: randomUUID() })), now)?.id).toBe(first.id);
  });
});

describe('bilingual content', () => {
  it('has equivalent translation keys', () => {
    const keys = (object: Record<string, unknown>, prefix = ''): string[] => Object.entries(object).flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? keys(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]);
    expect(keys(resources.en.translation).sort()).toEqual(keys(resources.tr.translation).sort());
  });
  it('includes complete, age-valid translations for every published demo item', async () => {
    for (const content of (await database().forPersona('parent').content()).items) {
      expect(content.minAgeMonths).toBeLessThanOrEqual(content.maxAgeMonths);
      for (const language of ['tr', 'en'] as const) {
        expect(content.translations[language].title.length).toBeGreaterThan(0);
        if (content.kind === 'activity') expect(content.translations[language].steps.length).toBeGreaterThan(0);
        else expect(content.translations[language].body.length).toBeGreaterThan(0);
      }
    }
  });
});
