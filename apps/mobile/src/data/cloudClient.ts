import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { chunkedSecureStorage } from './secureStorage';
import { AppError } from '../domain/models';
import { settings } from '../config/settings';

export async function createCloudClient() {
  const { url, publishableKey } = settings.supabase;
  if (!/^https:\/\/.+/.test(url) || !publishableKey.startsWith('sb_publishable_')) throw new AppError('configuration');
  const safeKey = (key: string) => `kids-guide.cloud.${key.replace(/[^\w.-]/g, '_')}`;
  const secure = chunkedSecureStorage({ getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync }, Crypto.randomUUID);
  return createClient(url, publishableKey, {
    auth: {
      // Refresh on demand through getSession, never in the background. Switching
      // back to offline must not leave a cloud token-refresh timer running.
      autoRefreshToken: false, persistSession: true, detectSessionInUrl: false,
      storage: {
        getItem: async key => Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.localStorage.getItem(key)) : secure.getItem(safeKey(key)),
        setItem: async (key, value) => {
          if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); }
          else await secure.setItem(safeKey(key), value);
        },
        removeItem: async key => {
          if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.removeItem(key); }
          else await secure.removeItem(safeKey(key));
        },
      },
    },
    global: {
      fetch: async (input, init) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), settings.network.timeoutMs);
        try { return await fetch(input, { ...init, signal: controller.signal }); }
        finally { clearTimeout(timer); }
      },
    },
  });
}
