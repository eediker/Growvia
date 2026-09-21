import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService, cloudError } from './supabase';
import { demoUsers } from './offline';

describe('managed-cloud adapter', () => {
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
