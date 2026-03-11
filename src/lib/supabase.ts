import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
// Native: use SecureStore (encrypted keychain / keystore) with AsyncStorage
// as a fallback for values that exceed SecureStore's 2048-byte limit.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    }
    try {
      // Try SecureStore first, then fall back to AsyncStorage
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;
      return await AsyncStorage.getItem(key);
    } catch {
      // SecureStore may fail on some devices; try AsyncStorage
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
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
      // may exceed this. Fall back to AsyncStorage so session persists
      // across app restarts (less secure but functional).
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        console.warn(`Storage: failed to persist key "${key}" (${value.length} bytes)`);
      }
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
    // Also clean up AsyncStorage fallback
    try {
      await AsyncStorage.removeItem(key);
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
