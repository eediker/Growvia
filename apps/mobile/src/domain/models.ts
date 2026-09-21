import { z } from 'zod';

export const languageSchema = z.enum(['tr', 'en']);
export type Language = z.infer<typeof languageSchema>;
export type DataMode = 'offline' | 'online';
export type Persona = 'parent' | 'teacher';
export const kindSchema = z.enum(['activity', 'story', 'guide']);
export type ContentKind = z.infer<typeof kindSchema>;
export const translationSchema = z.object({
  title: z.string(), summary: z.string(), materials: z.array(z.string()), steps: z.array(z.string()),
  body: z.string(), parentTip: z.string(), safetyNote: z.string(),
});
export const contentSchema = z.object({
  id: z.string(), kind: kindSchema, status: z.enum(['draft', 'published', 'archived']),
  area: z.enum(['discovery', 'nature', 'movement', 'language', 'connection']),
  minAgeMonths: z.number().int().min(12), maxAgeMonths: z.number().int().max(95), durationMinutes: z.number().int().positive(),
  translations: z.object({ tr: translationSchema, en: translationSchema }),
});
export type Content = z.infer<typeof contentSchema>;
export const userSchema = z.object({ id: z.string(), name: z.string(), email: z.string(), isTeacher: z.boolean(), canEditContent: z.boolean() });
export type User = z.infer<typeof userSchema>;
export const childSchema = z.object({ id: z.string().uuid(), name: z.string(), dateOfBirth: z.string() });
export type Child = z.infer<typeof childSchema>;
export const classSchema = z.object({ id: z.string().uuid(), name: z.string(), schoolName: z.string(), canPost: z.boolean() });
export type Classroom = z.infer<typeof classSchema>;
export const postSchema = z.object({ id: z.string().uuid(), classId: z.string().uuid(), teacherName: z.string(), activityId: z.string(), message: z.string(), language: languageSchema, createdAt: z.string() });
export type ClassPost = z.infer<typeof postSchema>;
export const completionSchema = z.object({ id: z.string().uuid(), childId: z.string().uuid(), activityId: z.string(), completedAt: z.string() });
export type Completion = z.infer<typeof completionSchema>;
export const pageSchema = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item), total: z.number(), offset: z.number(), limit: z.number() });

export type CreatePost = { id: string; activityId: string; message: string; language: Language };
export type CreateChild = Pick<Child, 'name' | 'dateOfBirth'>;
export type ContentFilter = { kind?: ContentKind; ageMonths?: number; search?: string; language?: Language; offset?: number; limit?: number };
export type Page<T> = { items: T[]; total: number; offset: number; limit: number };

/** UI features depend on this contract, never on fetch or native storage. */
export interface KidsGuideGateway {
  me(): Promise<User>;
  children(): Promise<Child[]>;
  createChild(input: CreateChild): Promise<Child>;
  content(filter?: ContentFilter): Promise<Page<Content>>;
  contentById(id: string): Promise<Content>;
  classes(): Promise<Classroom[]>;
  posts(classId: string, offset?: number): Promise<Page<ClassPost>>;
  shareActivity(classId: string, input: CreatePost): Promise<void>;
  completions(childId: string): Promise<Completion[]>;
  complete(childId: string, activityId: string, id: string): Promise<Completion>;
  removeCompletion(childId: string, id: string): Promise<void>;
}

export type ErrorCode = 'unauthorized' | 'notFound' | 'invalid' | 'conflict' | 'network' | 'server' | 'storage' | 'configuration';
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, options?: ErrorOptions) { super(code, options); }
}

export function ageInMonths(dateOfBirth: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.valueOf()) || birth.toISOString().slice(0, 10) !== dateOfBirth) return null;
  return (today.getUTCFullYear() - birth.getUTCFullYear()) * 12 + today.getUTCMonth() - birth.getUTCMonth()
    - (today.getUTCDate() < birth.getUTCDate() ? 1 : 0);
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ı/g, 'i');
}

export function validateChild(input: CreateChild, now = new Date()): CreateChild {
  const age = ageInMonths(input.dateOfBirth, now);
  if (!input.name.trim() || input.name.trim().length > 80 || age === null || age < 12 || age > 95) throw new AppError('invalid');
  return { name: input.name.trim(), dateOfBirth: input.dateOfBirth };
}

export function recommend(content: Content[], child: Child | undefined, history: Completion[], now = new Date()): Content | undefined {
  if (!child) return undefined;
  const age = ageInMonths(child.dateOfBirth, now);
  if (age === null) return undefined;
  const eligible = content.filter(item => item.kind === 'activity' && item.status === 'published' && age >= item.minAgeMonths && age <= item.maxAgeMonths);
  const lastCompleted = new Map<string, number>();
  for (const entry of history.filter(c => c.childId === child.id))
    lastCompleted.set(entry.activityId, Math.max(lastCompleted.get(entry.activityId) ?? 0, Date.parse(entry.completedAt)));
  return eligible.sort((a, b) => (lastCompleted.get(a.id) ?? 0) - (lastCompleted.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0];
}
