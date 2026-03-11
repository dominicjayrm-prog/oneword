import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_KEYS = {
  PROFILE: 'cache_profile',
  TODAY_WORD: 'cache_today_word',
  MY_DESCRIPTION: 'cache_my_description',
  LAST_RESULTS: 'cache_last_results',
  FRIENDS_LIST: 'cache_friends_list',
} as const;

export async function cacheData(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        data,
        cachedAt: Date.now(),
      }),
    );
  } catch (err) {
    console.warn('[cache] Failed to cache data for key:', key, err);
  }
}

export async function getCachedData<T = unknown>(key: string, maxAgeHours: number = 24): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const { data, cachedAt } = JSON.parse(raw);
    const ageHours = (Date.now() - cachedAt) / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) return null;
    return data as T;
  } catch {
    return null;
  }
}
