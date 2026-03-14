import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LAST_PROMPT_KEY = '@oneword_last_rate_prompt';
const PROMPT_COUNT_KEY = '@oneword_rate_prompt_count';
const MIN_PLAYS = 5;
const MIN_DAYS_BETWEEN_PROMPTS = 60;
const MAX_PROMPTS = 3;

export async function shouldShowRatePrompt(
  totalPlays: number,
  userRank: number,
  totalPlayers: number,
): Promise<boolean> {
  // Only iOS and Android support StoreReview
  if (Platform.OS === 'web') return false;

  // Check play count
  if (totalPlays < MIN_PLAYS) return false;

  // Check if user is in top 50% (lower rank number = better)
  if (totalPlayers < 10) return false;
  const percentile = ((totalPlayers - userRank) / totalPlayers) * 100;
  if (percentile < 50) return false;

  // Check prompt count
  const countStr = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
  const count = countStr ? parseInt(countStr, 10) : 0;
  if (count >= MAX_PROMPTS) return false;

  // Check last prompt date
  const lastStr = await AsyncStorage.getItem(LAST_PROMPT_KEY);
  if (lastStr) {
    const last = new Date(lastStr);
    const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return false;
  }

  // Check if StoreReview is available
  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;

  return true;
}

export async function showRatePrompt(): Promise<void> {
  try {
    await StoreReview.requestReview();

    // Record that we prompted
    await AsyncStorage.setItem(LAST_PROMPT_KEY, new Date().toISOString());
    const countStr = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem(PROMPT_COUNT_KEY, (count + 1).toString());
  } catch (error) {
    console.warn('[rateApp] Failed to show rate prompt:', error);
  }
}
