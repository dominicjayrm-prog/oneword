import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { Button } from './Button';
import { registerForPushNotifications, scheduleDailyReminder, scheduleStreakRisk, getNotificationPermissionStatus } from '../lib/notifications';
import { haptic } from '../lib/haptics';
import { fontSize, spacing, borderRadius } from '../constants/theme';

const DECLINED_COUNT_KEY = 'notification_prompt_declined_count';
const PERMANENTLY_DISMISSED_KEY = 'notification_prompt_permanently_dismissed';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function NotificationPermissionPrompt({ visible, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const [enabling, setEnabling] = useState(false);

  async function handleEnable() {
    if (!session?.user?.id) return;
    setEnabling(true);
    haptic.medium();
    try {
      const token = await registerForPushNotifications(session.user.id);
      if (token) {
        // Schedule default notifications
        await scheduleDailyReminder(9, 0, t('notifications.daily_title'), t('notifications.daily_body'));
        await scheduleStreakRisk(20, 0, t('notifications.streak_risk_title'), t('notifications.streak_risk_body'));
      }
    } catch {
      // Non-critical
    } finally {
      setEnabling(false);
      onDismiss();
    }
  }

  async function handleLater() {
    haptic.light();
    try {
      const countStr = await AsyncStorage.getItem(DECLINED_COUNT_KEY);
      const count = countStr ? parseInt(countStr, 10) : 0;
      const newCount = count + 1;
      await AsyncStorage.setItem(DECLINED_COUNT_KEY, String(newCount));
      if (newCount >= 2) {
        await AsyncStorage.setItem(PERMANENTLY_DISMISSED_KEY, 'true');
      }
    } catch {
      // Non-critical
    }
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={styles.bellEmoji}>{'\uD83D\uDD14'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('notifications.permission_title')}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{t('notifications.permission_body')}</Text>
          <Button
            title={t('notifications.permission_enable')}
            onPress={handleEnable}
            loading={enabling}
          />
          <TouchableOpacity onPress={handleLater} activeOpacity={0.7} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.textMuted }]}>{t('notifications.permission_later')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Determine if we should show the notification permission prompt.
 * Call after the user's first submission.
 */
export async function shouldShowNotificationPrompt(): Promise<boolean> {
  // Web doesn't support push notifications via expo-notifications
  if (Platform.OS === 'web') return false;

  try {
    // If permission is already granted, no need to prompt
    const status = await getNotificationPermissionStatus();
    if (status === 'granted') return false;

    const permanentlyDismissed = await AsyncStorage.getItem(PERMANENTLY_DISMISSED_KEY);
    if (permanentlyDismissed === 'true') return false;

    const countStr = await AsyncStorage.getItem(DECLINED_COUNT_KEY);
    const declineCount = countStr ? parseInt(countStr, 10) : 0;

    // First submission: always show
    // After 1 decline: show again after 3 days (handled by caller via play count)
    // After 2 declines: never show
    if (declineCount >= 2) return false;

    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.md,
  },
  bellEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  laterBtn: {
    paddingVertical: spacing.sm,
  },
  laterText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
