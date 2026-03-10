import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.',
  );
}

// Web: use sessionStorage instead of localStorage to limit XSS exposure.
// sessionStorage is scoped to the tab and cleared when the tab closes,
// so stolen tokens have a shorter window of exploitation.
// Native: use SecureStore (encrypted keychain / keystore).
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore has a 2048-byte limit per value; large session tokens
      // may exceed this. Swallow the error so the app doesn't crash —
      // the session will still work in-memory for this app session.
      console.warn(`SecureStore: failed to persist key "${key}" (${value.length} bytes)`);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
