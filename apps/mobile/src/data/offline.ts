import { z } from 'zod';
import { defaultGuideCategories } from '../domain/guides';
import seed from '../../../../shared/demo-content.json';
import { AppError, childSchema, completionSchema, contentSchema, postSchema, validateChild, normalizeSearch,
  type Child, type ClassPost, type Completion, type KidsGuideGateway, type Persona, type User } from '../domain/models';

export interface KeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
const demoSchema = z.object({ version: z.literal(1), children: z.array(childSchema), posts: z.array(postSchema), completions: z.array(completionSchema) });
type DemoState = z.infer<typeof demoSchema>;
const key = 'kids-guide.demo.v1';
export const demoClassId = '20000000-0000-4000-8000-000000000001';
export const demoChildId = '10000000-0000-4000-8000-000000000001';
export const demoUsers: Record<Persona, User> = {
  parent: { id: 'demo-parent', name: 'Deniz', email: 'parent@demo.kidsguide.test', isTeacher: false, canEditContent: false },
  teacher: { id: 'demo-teacher', name: 'Elif', email: 'teacher@demo.kidsguide.test', isTeacher: true, canEditContent: false },
};
const catalog = z.array(contentSchema).parse(seed).map(item => item.kind === 'guide' ? {
  ...item, categoryId: 'parenting-approach', sortOrder: item.id === 'guide-five' ? 10 : 20,
  relatedActivityId: item.id === 'guide-five' ? 'activity-colors' : 'activity-leaves',
} : item);
function initialState(now: Date): DemoState {
  const birth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 42, 15));
  return { version: 1, children: [{ id: demoChildId, name: 'Ada', dateOfBirth: birth.toISOString().slice(0, 10) }], completions: [],
    posts: [{ id: '40000000-0000-4000-8000-000000000001', classId: demoClassId, teacherName: 'Elif', activityId: 'activity-leaves',
      message: 'Bugün bahçede farklı yapraklar bulduk. İsterseniz keşfimize evde devam edebilirsiniz!', language: 'tr', createdAt: new Date(now.valueOf() - 7200000).toISOString() }] };
}

/** One database is shared by both demo personas; writes are serialized. */
export class DemoDatabase {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: KeyValueStorage, private uuid: () => string, private clock = () => new Date()) {}
  private async read(): Promise<DemoState> {
    try {
      const raw = await this.storage.getItem(key);
      if (raw) return demoSchema.parse(JSON.parse(raw));
      const state = initialState(this.clock());
      await this.storage.setItem(key, JSON.stringify(state));
      return state;
    } catch (cause) { throw new AppError('storage', { cause }); }
  }
  private transaction<T>(operation: (state: DemoState) => T, write = false): Promise<T> {
    const result = this.queue.then(async () => {
      const state = await this.read();
      const value = operation(state);
      if (write) {
        try { await this.storage.setItem(key, JSON.stringify(state)); }
        catch (cause) { throw new AppError('storage', { cause }); }
      }
      return value;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
  async reset(): Promise<void> {
    const result = this.queue.then(() => this.storage.setItem(key, JSON.stringify(initialState(this.clock()))));
    this.queue = result.catch(() => undefined);
    await result;
  }
  forPersona(persona: Persona): KidsGuideGateway {
    const parent = persona === 'parent';
    const requireParent = (state: DemoState, childId: string) => {
      if (!parent || !state.children.some(c => c.id === childId)) throw new AppError('notFound');
    };
    const activity = (id: string) => {
      if (!catalog.some(c => c.id === id && c.kind === 'activity' && c.status === 'published')) throw new AppError('notFound');
    };
    return {
      me: async () => demoUsers[persona],
      guideCategories: async () => defaultGuideCategories,
      children: () => this.transaction(state => parent ? state.children : []),
      createChild: input => this.transaction(state => {
        if (!parent || state.children.length >= 20) throw new AppError('invalid');
        const child: Child = { id: this.uuid(), ...validateChild(input, this.clock()) };
        state.children.push(child);
        return child;
      }, true),
      updateChild: (id, input) => this.transaction(state => {
        requireParent(state, id);
        const child = state.children.find(c => c.id === id)!;
        Object.assign(child, validateChild(input, this.clock()));
        return child;
      }, true),
      content: async (filter = {}) => {
        if (filter.ageMonths !== undefined && (filter.ageMonths < 12 || filter.ageMonths > 95)) throw new AppError('invalid');
        const items = catalog.filter(c => c.status === 'published' && (!filter.kind || c.kind === filter.kind)
          && (!filter.categoryId || c.categoryId === filter.categoryId)
          && (filter.ageMonths === undefined || (filter.ageMonths >= c.minAgeMonths && filter.ageMonths <= c.maxAgeMonths))
          && (!filter.search?.trim() || Object.entries(c.translations).some(([locale, text]) =>
            (!filter.language || locale === filter.language) && normalizeSearch(`${text.title} ${text.summary}`).includes(normalizeSearch(filter.search!.trim())))))
          .sort((a, b) => (filter.kind === 'guide' ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0) : 0) || a.id.localeCompare(b.id));
        const offset = Math.max(0, filter.offset ?? 0), limit = Math.max(1, Math.min(100, filter.limit ?? 100));
        return { items: items.slice(offset, offset + limit), total: items.length, offset, limit };
      },
      contentById: async id => {
        const item = catalog.find(c => c.id === id && c.status === 'published');
        if (!item) throw new AppError('notFound');
        return item;
      },
      classes: async () => [{ id: demoClassId, name: 'Sunflowers', schoolName: 'Little Garden', canPost: !parent }],
      posts: (classId, offset = 0) => this.transaction(state => {
        if (classId !== demoClassId) throw new AppError('notFound');
        const items = state.posts.filter(p => p.classId === classId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { items: items.slice(offset, offset + 50), total: items.length, offset, limit: 50 };
      }),
      shareActivity: (classId, input) => this.transaction(state => {
        if (parent || classId !== demoClassId) throw new AppError('notFound');
        if (!input.message.trim() || input.message.trim().length > 2000 || !z.uuid().safeParse(input.id).success || !['tr', 'en'].includes(input.language)) throw new AppError('invalid');
        activity(input.activityId);
        const previous = state.posts.find(p => p.id === input.id);
        if (previous) {
          if (previous.classId !== classId || previous.activityId !== input.activityId || previous.message !== input.message.trim() || previous.language !== input.language) throw new AppError('conflict');
          return;
        }
        const post: ClassPost = { ...input, classId, message: input.message.trim(), teacherName: demoUsers.teacher.name, createdAt: this.clock().toISOString() };
        state.posts.push(post);
      }, true),
      completions: childId => this.transaction(state => { requireParent(state, childId); return state.completions.filter(c => c.childId === childId).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 250); }),
      complete: (childId, activityId, id) => this.transaction(state => {
        requireParent(state, childId); activity(activityId);
        if (!z.uuid().safeParse(id).success) throw new AppError('invalid');
        const previous = state.completions.find(c => c.id === id);
        if (previous) {
          if (previous.childId !== childId || previous.activityId !== activityId) throw new AppError('conflict');
          return previous;
        }
        const result: Completion = { id, childId, activityId, completedAt: this.clock().toISOString() };
        state.completions.push(result);
        return result;
      }, true),
      removeCompletion: (childId, id) => this.transaction(state => { requireParent(state, childId); state.completions = state.completions.filter(c => !(c.childId === childId && c.id === id)); }, true),
    };
  }
}
