import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications are handled when the app is in the foreground
// Guard: expo-notifications handler is only meaningful on native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

/**
 * Register for push notifications and save the token to the user's profile.
 * Returns the Expo push token string or null if registration fails.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenData.data;

  // Save token to profile
  await supabase
    .from('profiles')
    .update({
      push_token: token,
      notifications_enabled: true,
    })
    .eq('id', userId);

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'OneWord',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B4A',
    });
  }

  return token;
}

/**
 * Schedule a daily reminder notification at the specified local time.
 */
export async function scheduleDailyReminder(hour: number, minute: number, title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
    identifier: 'daily-reminder',
  });
}

/**
 * Schedule a streak risk notification at the specified local time.
 */
export async function scheduleStreakRisk(hour: number, minute: number, title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync('streak-risk').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: 'streak_risk' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
    identifier: 'streak-risk',
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
}

export async function cancelStreakRisk() {
  await Notifications.cancelScheduledNotificationAsync('streak-risk').catch(() => {});
}

/**
 * Schedule a vote reminder notification 2 hours from now.
 * Fires once to remind the user to vote on remaining pairs.
 */
export async function scheduleVoteReminder(title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync('vote-reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2 * 60 * 60, // 2 hours
    },
    identifier: 'vote-reminder',
  });
}

export async function cancelVoteReminder() {
  await Notifications.cancelScheduledNotificationAsync('vote-reminder').catch(() => {});
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fire a local notification immediately for a streak milestone.
 */
export async function triggerMilestoneNotification(emoji: string, streak: number, name: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${streak}-DAY STREAK!`,
      body: `You're ${name}. Keep it going!`,
      sound: true,
      data: { type: 'milestone' },
    },
    trigger: null, // immediate
  });
}

/**
 * Fire a local notification when friends submit their descriptions.
 */
export async function triggerFriendActivityNotification(friendUsernames: string[]) {
  if (friendUsernames.length === 0) return;
  const names = friendUsernames
    .slice(0, 3)
    .map((u) => `@${u}`)
    .join(', ');
  const more = friendUsernames.length > 3 ? ` +${friendUsernames.length - 3} more` : '';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Friends are playing!',
      body: `${names}${more} submitted today. Check out their descriptions!`,
      sound: true,
      data: { type: 'friend_activity' },
    },
    trigger: null, // immediate
  });
}

/**
 * Fire a local notification when a friend beats you on the leaderboard.
 */
export async function triggerFriendBeatYouNotification(friendUsername: string, friendRank: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `@${friendUsername} is at #${friendRank}!`,
      body: 'Your friend is climbing the leaderboard. Can you beat them?',
      sound: true,
      data: { type: 'friend_activity' },
    },
    trigger: null, // immediate
  });
}

/**
 * Set the app badge count (1 = hasn't played, 0 = played/clear).
 */
export async function setBadgeCount(count: number) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badge not supported on all platforms
  }
}

/**
 * Check if notifications permission has been granted.
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Parse a time string that may be "HH:MM" or "HH:MM:SS" (Supabase TIME type).
 * Returns [hour, minute] with safe defaults.
 */
export function parseTimeString(timeStr: string | null | undefined): [number, number] {
  if (!timeStr) return [9, 0];
  const parts = timeStr.split(':').map(Number);
  const h = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 9;
  const m = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
  return [h, m];
}

/**
 * Normalize a time string to "HH:MM" format (strips seconds if present).
 */
export function normalizeTimeString(timeStr: string | null | undefined): string {
  const [h, m] = parseTimeString(timeStr);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
