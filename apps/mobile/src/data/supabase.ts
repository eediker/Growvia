import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AppError, childSchema, classSchema, completionSchema, contentSchema, pageSchema, postSchema, userSchema, type KidsGuideGateway } from '../domain/models';

export type SupabaseFactory = () => Promise<SupabaseClient>;

export function cloudError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const value = error as { code?: string; status?: number; message?: string; name?: string };
  if (value.status === 401 || value.code === 'PGRST301' || value.code === 'unauthorized' || value.message === 'unauthorized' || value.code === 'invalid_credentials') return new AppError('unauthorized');
  if (value.status === 403 || value.code === '42501' || value.message === 'notFound') return new AppError('notFound');
  if (value.code === '23505' || value.message === 'conflict') return new AppError('conflict');
  if (value.code === '23514' || value.code === '22023' || value.message === 'invalid') return new AppError('invalid');
  if (value.name === 'AuthRetryableFetchError' || /fetch|network|abort/i.test(value.message ?? '')) return new AppError('network');
  return new AppError('server');
}

/** Lazy initialization is essential: an offline launch must not initialize Auth. */
export class SupabaseService {
  private client: Promise<SupabaseClient> | undefined;
  constructor(private factory: SupabaseFactory) {}
  private getClient() { return this.client ??= this.factory().catch(error => { this.client = undefined; throw error; }); }
  private async rpc<T>(name: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    try {
      const client = await this.getClient();
      const session = await client.auth.getSession();
      if (session.error) throw session.error;
      if (!session.data.session) throw new AppError('unauthorized');
      const { data, error } = await client.rpc(name, args);
      if (error) throw error;
      return schema.parse(data);
    } catch (error) { throw cloudError(error); }
  }
  async login(email: string, password: string): Promise<void> {
    try {
      const { error } = await (await this.getClient()).auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) { throw cloudError(error); }
  }
  async logout(): Promise<void> {
    try {
      const { error } = await (await this.getClient()).auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) { throw cloudError(error); }
  }
  readonly gateway: KidsGuideGateway = {
    me: () => this.rpc('kg_me', {}, userSchema),
    children: () => this.rpc('kg_children', {}, z.array(childSchema)),
    createChild: input => this.rpc('kg_create_child', { p_name: input.name, p_date_of_birth: input.dateOfBirth }, childSchema),
    content: (filter = {}) => this.rpc('kg_content_list', { p_kind: filter.kind ?? null, p_age_months: filter.ageMonths ?? null,
      p_search: filter.search ?? null, p_language: filter.language ?? null, p_offset: filter.offset ?? 0, p_limit: filter.limit ?? 100 }, pageSchema(contentSchema)),
    contentById: id => this.rpc('kg_content_by_id', { p_id: id }, contentSchema),
    classes: () => this.rpc('kg_classes', {}, z.array(classSchema)),
    posts: (classId, offset = 0) => this.rpc('kg_posts', { p_class_id: classId, p_offset: offset, p_limit: 50 }, pageSchema(postSchema)),
    shareActivity: async (classId, input) => { await this.rpc('kg_share_activity', { p_class_id: classId, p_id: input.id, p_activity_id: input.activityId,
      p_message: input.message, p_language: input.language }, z.null()); },
    completions: childId => this.rpc('kg_completions', { p_child_id: childId }, z.array(completionSchema)),
    complete: (childId, activityId, id) => this.rpc('kg_complete', { p_child_id: childId, p_activity_id: activityId, p_id: id }, completionSchema),
    removeCompletion: async (childId, id) => { await this.rpc('kg_remove_completion', { p_child_id: childId, p_id: id }, z.null()); },
  };
}
