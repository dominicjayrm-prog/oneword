import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications are handled when the app is in the foreground
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
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  // Save token to profile
  await supabase.from('profiles').update({
    push_token: token,
    notifications_enabled: true,
  }).eq('id', userId);

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
