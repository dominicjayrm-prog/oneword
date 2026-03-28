import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { supabase } from '../src/lib/supabase';
import {
  scheduleDailyReminder,
  scheduleStreakRisk,
  cancelDailyReminder,
  cancelStreakRisk,
  scheduleVoteReminder,
  cancelVoteReminder,
  normalizeTimeString,
  parseTimeString,
} from '../src/lib/notifications';
import { haptic } from '../src/lib/haptics';
import { fontSize, spacing, borderRadius, withOpacity } from '../src/constants/theme';

interface NotificationPrefs {
  notify_daily: boolean;
  notify_daily_time: string;
  notify_streak_risk: boolean;
  notify_results: boolean;
  notify_vote_reminder: boolean;
  notify_friend_requests: boolean;
  notify_friend_activity: boolean;
  notify_weekly_recap: boolean;
  notify_welcome_back: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  notify_daily: true,
  notify_daily_time: '09:00',
  notify_streak_risk: true,
  notify_results: true,
  notify_vote_reminder: true,
  notify_friend_requests: true,
  notify_friend_activity: true,
  notify_weekly_recap: true,
  notify_welcome_back: true,
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select(
            'notify_daily, notify_daily_time, notify_streak_risk, notify_results, notify_friend_requests, notify_friend_activity, notify_weekly_recap, notify_welcome_back',
          )
          .eq('id', session.user.id)
          .single();
        const voteReminderPref = await AsyncStorage.getItem('oneword_vote_reminder');
        if (data) {
          setPrefs({
            notify_daily: data.notify_daily ?? true,
            notify_daily_time: normalizeTimeString(data.notify_daily_time),
            notify_streak_risk: data.notify_streak_risk ?? true,
            notify_results: data.notify_results ?? true,
            notify_vote_reminder: voteReminderPref !== 'false',
            notify_friend_requests: data.notify_friend_requests ?? true,
            notify_friend_activity: data.notify_friend_activity ?? true,
            notify_weekly_recap: data.notify_weekly_recap ?? true,
            notify_welcome_back: data.notify_welcome_back ?? true,
          });
        }
      } catch (err) {
        console.warn('[NotificationsScreen] Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  const saveField = useCallback(
    async (field: keyof NotificationPrefs, value: boolean | string) => {
      if (!session?.user?.id) return;
      const prevValue = prefs[field];
      setPrefs((prev) => ({ ...prev, [field]: value }));
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ [field]: value })
          .eq('id', session.user.id);
        if (error) {
          console.warn('[NotificationsScreen] Failed to save setting:', error);
          setPrefs((prev) => ({ ...prev, [field]: prevValue }));
        }
      } catch (err) {
        console.warn('[NotificationsScreen] Failed to save setting:', err);
        setPrefs((prev) => ({ ...prev, [field]: prevValue }));
      }
    },
    [session?.user?.id, prefs],
  );

  const handleToggle = useCallback(
    async (field: keyof NotificationPrefs, value: boolean) => {
      haptic.light();
      await saveField(field, value);

      // Handle local scheduling for daily reminder and streak risk
      if (field === 'notify_daily') {
        if (value) {
          const [h, m] = parseTimeString(prefs.notify_daily_time);
          await scheduleDailyReminder(h, m, t('notifications.daily_title'), t('notifications.daily_body'));
        } else {
          await cancelDailyReminder();
        }
      }
      if (field === 'notify_streak_risk') {
        if (value) {
          await scheduleStreakRisk(20, 0, t('notifications.streak_risk_title'), t('notifications.streak_risk_body'));
        } else {
          await cancelStreakRisk();
        }
      }
      if (field === 'notify_vote_reminder') {
        await AsyncStorage.setItem('oneword_vote_reminder', value ? 'true' : 'false');
        if (!value) {
          await cancelVoteReminder();
        }
        return; // Don't save to DB — stored in AsyncStorage
      }
    },
    [prefs.notify_daily_time, saveField, t],
  );

  const handleTimeSelect = useCallback(
    async (hour: number, minute: number) => {
      haptic.selection();
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      setShowTimePicker(false);
      await saveField('notify_daily_time', timeStr);
      if (prefs.notify_daily) {
        await scheduleDailyReminder(hour, minute, t('notifications.daily_title'), t('notifications.daily_body'));
      }
    },
    [prefs.notify_daily, saveField, t],
  );

  function formatTime(timeStr: string): string {
    const [h, m] = parseTimeString(timeStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>
            {'\u2190'} {t('nav_back')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('notifications.settings_title')}</Text>
      </View>

      {/* Daily Reminder */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_daily')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.daily_reminder')}
          value={prefs.notify_daily}
          onToggle={(v) => handleToggle('notify_daily', v)}
          colors={colors}
        />
        {prefs.notify_daily && (
          <TouchableOpacity
            style={[styles.row, styles.timeRow]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('notifications.daily_time')}</Text>
            <Text style={[styles.timeValue, { color: colors.primary }]}>{formatTime(prefs.notify_daily_time)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Streak */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_streak')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.streak_risk')}
          value={prefs.notify_streak_risk}
          onToggle={(v) => handleToggle('notify_streak_risk', v)}
          colors={colors}
        />
      </View>

      {/* Results */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_results')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.results_ready')}
          value={prefs.notify_results}
          onToggle={(v) => handleToggle('notify_results', v)}
          colors={colors}
        />
      </View>

      {/* Voting */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_voting')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.vote_reminder')}
          value={prefs.notify_vote_reminder}
          onToggle={(v) => handleToggle('notify_vote_reminder', v)}
          colors={colors}
        />
      </View>

      {/* Social */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_social')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.friend_requests')}
          value={prefs.notify_friend_requests}
          onToggle={(v) => handleToggle('notify_friend_requests', v)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ToggleRow
          label={t('notifications.friend_activity')}
          value={prefs.notify_friend_activity}
          onToggle={(v) => handleToggle('notify_friend_activity', v)}
          colors={colors}
        />
      </View>

      {/* Weekly */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_weekly')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.weekly_recap')}
          value={prefs.notify_weekly_recap}
          onToggle={(v) => handleToggle('notify_weekly_recap', v)}
          colors={colors}
        />
      </View>

      {/* Re-engagement */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('notifications.section_reengagement')}</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ToggleRow
          label={t('notifications.welcome_back')}
          value={prefs.notify_welcome_back}
          onToggle={(v) => handleToggle('notify_welcome_back', v)}
          colors={colors}
        />
      </View>

      {/* Time Picker Modal — scroll wheel style */}
      <Modal visible={showTimePicker} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('notifications.daily_time')}</Text>
            <TimeScrollPicker initialTime={prefs.notify_daily_time} onSelect={handleTimeSelect} colors={colors} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function TimeScrollPicker({
  initialTime,
  onSelect,
  colors,
}: {
  initialTime: string;
  onSelect: (hour: number, minute: number) => void;
  colors: any;
}) {
  const { t } = useTranslation();
  const [h, m] = parseTimeString(initialTime);
  const [selectedHour, setSelectedHour] = useState(h);
  const [selectedMinute, setSelectedMinute] = useState(MINUTES.indexOf(m) >= 0 ? MINUTES.indexOf(m) : 0);

  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      hourRef.current?.scrollTo({ y: selectedHour * ITEM_HEIGHT, animated: false });
      minuteRef.current?.scrollTo({ y: selectedMinute * ITEM_HEIGHT, animated: false });
    }, 50);
  }, []);

  const handleHourScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < 24) setSelectedHour(index);
  }, []);

  const handleMinuteScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < MINUTES.length) setSelectedMinute(index);
  }, []);

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12} ${ampm}`;
  };

  const formatMin = (min: number) => {
    return `:${String(min).padStart(2, '0')}`;
  };

  return (
    <View>
      <View style={styles.wheelContainer}>
        {/* Selection highlight band */}
        <View
          style={[
            styles.selectionBand,
            { backgroundColor: withOpacity(colors.primary, 0.08), borderColor: withOpacity(colors.primary, 0.2) },
          ]}
        />

        {/* Hour wheel */}
        <ScrollView
          ref={hourRef}
          style={styles.wheelColumn}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleHourScroll}
          onScrollEndDrag={handleHourScroll}
        >
          {HOURS.map((hour) => (
            <View key={hour} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelText,
                  { color: hour === selectedHour ? colors.text : withOpacity(colors.textMuted, 0.4) },
                  hour === selectedHour && styles.wheelTextSelected,
                ]}
              >
                {formatHour(hour)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Minute wheel */}
        <ScrollView
          ref={minuteRef}
          style={styles.wheelColumn}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMinuteScroll}
          onScrollEndDrag={handleMinuteScroll}
        >
          {MINUTES.map((min, i) => (
            <View key={min} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelText,
                  { color: i === selectedMinute ? colors.text : withOpacity(colors.textMuted, 0.4) },
                  i === selectedMinute && styles.wheelTextSelected,
                ]}
              >
                {formatMin(min)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
        onPress={() => onSelect(selectedHour, MINUTES[selectedMinute])}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmBtnText}>{t('common.ok')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: withOpacity(colors.primary, 0.5) }}
        thumbColor={value ? colors.primary : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: fontSize.xs - 1,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  section: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timeRow: {
    borderTopWidth: 0,
  },
  rowLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  timeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 300,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  wheelContainer: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionBand: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    zIndex: 1,
    pointerEvents: 'none',
  },
  wheelColumn: {
    flex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 18,
    fontFamily: 'DMMono_400Regular',
    fontWeight: '400',
  },
  wheelTextSelected: {
    fontWeight: '700',
    fontSize: 20,
  },
  confirmBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
