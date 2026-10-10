import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService, cloudError } from './supabase';
import { demoUsers } from './offline';

describe('managed-cloud adapter', () => {
  it('loads guide categories and filters ordered guides through the CMS RPCs', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ id: 'daily-life', names: { tr: 'Günlük Yaşam', en: 'Everyday life' }, sortOrder: 40 }], error: null })
      .mockResolvedValueOnce({ data: { items: [], total: 0, offset: 30, limit: 30 }, error: null });
    const client = { rpc, auth: { getSession: async () => ({ data: { session: { user: { id: 'parent' } } }, error: null }) } } as unknown as SupabaseClient;
    const gateway = new SupabaseService(async () => client).gateway;
    expect((await gateway.guideCategories())[0]?.names.en).toBe('Everyday life');
    await gateway.content({ kind: 'guide', categoryId: 'daily-life', search: 'Routine', language: 'en', offset: 30, limit: 30 });
    expect(rpc).toHaveBeenLastCalledWith('kg_guide_list', { p_category_id: 'daily-life', p_age_months: null, p_search: 'Routine', p_language: 'en', p_offset: 30, p_limit: 30 });
  });
  it('registers only profile metadata and waits for email confirmation without inventing a session', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const client = { auth: { signUp } } as unknown as SupabaseClient;
    const service = new SupabaseService(async () => client);
    expect(await service.signup(' Deniz ', ' parent@example.com ', 'test-password')).toBe('confirmationRequired');
    expect(signUp).toHaveBeenCalledWith({ email: 'parent@example.com', password: 'test-password', options: { data: { name: 'Deniz' } } });
    signUp.mockResolvedValueOnce({ data: { session: { user: { id: 'parent' } } }, error: null });
    expect(await service.signup('Deniz', 'parent@example.com', 'test-password')).toBe('signedIn');
  });
  it('rejects invalid registration before contacting Supabase', async () => {
    const factory = vi.fn();
    const service = new SupabaseService(factory);
    await expect(service.signup('', 'parent@example.com', 'test-password')).rejects.toMatchObject({ code: 'authInvalid' });
    await expect(service.signup('Deniz', 'not-email', 'test-password')).rejects.toMatchObject({ code: 'authInvalid' });
    await expect(service.signup('Deniz', 'parent@example.com', 'short')).rejects.toMatchObject({ code: 'weakPassword' });
    expect(factory).not.toHaveBeenCalled();
  });
  it('supports confirmation resends and reports delivery limits', async () => {
    const resend = vi.fn().mockResolvedValue({ error: null });
    const service = new SupabaseService(async () => ({ auth: { resend } }) as unknown as SupabaseClient);
    await service.resendConfirmation(' parent@example.com ');
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'parent@example.com' });
    resend.mockResolvedValueOnce({ error: { status: 429 } });
    await expect(service.resendConfirmation('parent@example.com')).rejects.toMatchObject({ code: 'rateLimited' });
  });
  it('restores the saved session without password login and rejects access after local logout', async () => {
    let session: object | null = { user: { id: 'demo-parent' } };
    const signInWithPassword = vi.fn();
    const signOut = vi.fn().mockImplementation(async () => { session = null; return { error: null }; });
    const rpc = vi.fn().mockResolvedValue({ data: demoUsers.parent, error: null });
    const client = { rpc, auth: { getSession: async () => ({ data: { session }, error: null }), signInWithPassword, signOut } } as unknown as SupabaseClient;
    const service = new SupabaseService(async () => client);
    expect(await service.gateway.me()).toEqual(demoUsers.parent);
    expect(signInWithPassword).not.toHaveBeenCalled();
    await service.logout();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    await expect(service.gateway.me()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('keeps registration failures out of the signed-in flow', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: { code: 'signup_disabled' } });
    const service = new SupabaseService(async () => ({ auth: { signUp } }) as unknown as SupabaseClient);
    await expect(service.signup('Deniz', 'parent@example.com', 'test-password')).rejects.toMatchObject({ code: 'signupUnavailable' });
    expect(cloudError({ code: 'email_not_confirmed' }).code).toBe('emailUnconfirmed');
    expect(cloudError({ code: 'email_address_not_authorized' }).code).toBe('signupUnavailable');
    expect(cloudError({ code: 'refresh_token_not_found' }).code).toBe('unauthorized');
  });
  it('does not initialize cloud authentication until selected and used', async () => {
    const factory = vi.fn();
    const service = new SupabaseService(factory);
    expect(service.gateway).toBeDefined();
    expect(factory).not.toHaveBeenCalled();
  });
  it('uses scoped RPCs and validates the returned contract', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: demoUsers.parent, error: null });
    const client = { rpc, auth: { getSession: async () => ({ data: { session: { user: { id: 'demo-parent' } } }, error: null }) } } as unknown as SupabaseClient;
    const service = new SupabaseService(async () => client);
    expect((await service.gateway.me()).name).toBe('Deniz');
    expect(rpc).toHaveBeenCalledWith('kg_me', {});
    rpc.mockResolvedValueOnce({ data: { unexpected: true }, error: null });
    await expect(service.gateway.children()).rejects.toMatchObject({ code: 'server' });
  });
  it('requires authentication without silently returning demo data', async () => {
    const rpc = vi.fn();
    const client = { rpc, auth: { getSession: async () => ({ data: { session: null }, error: null }) } } as unknown as SupabaseClient;
    await expect(new SupabaseService(async () => client).gateway.children()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('maps access, validation and network failures without leaking raw server details', () => {
    expect(cloudError({ message: 'notFound' }).code).toBe('notFound');
    expect(cloudError({ code: '23514' }).code).toBe('invalid');
    expect(cloudError({ code: '23505' }).code).toBe('conflict');
    expect(cloudError({ name: 'AuthRetryableFetchError' }).code).toBe('network');
  });
});
