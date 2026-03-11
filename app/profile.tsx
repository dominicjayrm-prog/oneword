import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { BadgePill } from '../src/components/BadgePill';
import { BadgeProgress } from '../src/components/BadgeProgress';
import { useToast } from '../src/components/Toast';
import { fontSize, spacing, borderRadius, withOpacity } from '../src/constants/theme';
import { haptic } from '../src/lib/haptics';

function confirmDialog(title: string, message: string, cancelText: string, okText: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: okText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const AVATARS = [
  '\uD83C\uDFAD',
  '\uD83E\uDD8A',
  '\uD83D\uDC19',
  '\uD83C\uDF1F',
  '\uD83C\uDFA8',
  '\uD83D\uDD25',
  '\uD83D\uDC8E',
  '\uD83C\uDF19',
  '\uD83E\uDD84',
  '\uD83C\uDF55',
  '\uD83C\uDFAF',
  '\uD83E\uDDCA',
  '\uD83E\uDE90',
  '\uD83C\uDFB8',
  '\uD83C\uDF0A',
  '\uD83E\uDD85',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile, signOut, updateAvatar, updateLanguage, deleteAccount, language } = useAuthContext();
  const { showToast } = useToast();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!profile) {
      router.replace('/');
    }
  }, [profile]);

  if (!profile) {
    return (
      <View style={[styles.scrollView, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const memberSince = new Date(profile.created_at).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  async function handleAvatarSelect(emoji: string) {
    haptic.light();
    try {
      const { error } = await updateAvatar(emoji);
      if (error) {
        showToast(t('errors.generic'), 'error');
        return;
      }
      setShowAvatarPicker(false);
    } catch {
      showToast(t('errors.generic'), 'error');
    }
  }

  async function handleLanguageSwitch(lang: string) {
    haptic.medium();
    const prevLang = language;
    try {
      const { error } = await updateLanguage(lang);
      if (error) {
        showToast(t('errors.generic'), 'error');
        await updateLanguage(prevLang);
      }
    } catch {
      showToast(t('errors.generic'), 'error');
      await updateLanguage(prevLang);
    }
  }

  async function handleLogout() {
    haptic.warning();
    const ok = await confirmDialog(
      t('profile.log_out_title'),
      t('profile.log_out_message'),
      t('common.cancel'),
      t('common.ok'),
    );
    if (ok) {
      try {
        await signOut();
      } catch {
        showToast(t('errors.generic'), 'error');
      }
    }
  }

  async function handleDeleteAccount() {
    haptic.error();
    const ok = await confirmDialog(
      t('profile.delete_title'),
      t('errors.delete_confirm'),
      t('common.cancel'),
      t('common.ok'),
    );
    if (!ok) return;

    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!profile || deleteUsername !== profile.username) return;
    setDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        showToast(t('profile.delete_error'), 'error');
      } else {
        setShowDeleteConfirm(false);
      }
    } catch {
      showToast(t('profile.delete_error'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const stats = [
    { label: t('profile.current_streak'), value: `${profile.current_streak}`, icon: '\uD83D\uDD25' },
    { label: t('profile.best_streak'), value: `${profile.longest_streak}`, icon: '\u2B50' },
    { label: t('profile.total_plays'), value: `${profile.total_plays}`, icon: '\uD83C\uDFAE' },
    { label: t('profile.votes_received'), value: `${profile.total_votes_received}`, icon: '\uD83D\uDC4D' },
    { label: t('profile.best_rank'), value: profile.best_rank ? `#${profile.best_rank}` : '-', icon: '\uD83C\uDFC6' },
  ];

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
    >
      <ThemeToggle />

      {/* Avatar + Username */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={[styles.avatarContainer, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            setShowAvatarPicker(!showAvatarPicker);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText}>{profile.avatar_url || '\uD83C\uDFAD'}</Text>
        </TouchableOpacity>
        <Text style={[styles.tapToChange, { color: colors.textMuted }]}>{t('profile.tap_to_change')}</Text>

        <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
        {profile.current_streak > 0 && (
          <View style={styles.badgeRow}>
            <BadgePill streak={profile.current_streak} showName size="md" />
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
              {t('game.day_streak', { count: profile.current_streak })}
            </Text>
          </View>
        )}
        <Text style={[styles.memberSince, { color: colors.textMuted }]}>
          {t('profile.member_since', { date: memberSince })}
        </Text>
      </View>

      {/* Badge Progress */}
      <View style={styles.badgeProgressSection}>
        <BadgeProgress streak={profile.current_streak} />
      </View>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <View style={[styles.avatarPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.textSecondary }]}>{t('profile.choose_avatar')}</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.avatarOption,
                  { backgroundColor: colors.background },
                  profile.avatar_url === emoji && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => handleAvatarSelect(emoji)}
              >
                <Text style={styles.avatarOptionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title={t('profile.back_home')} onPress={() => router.replace('/')} variant="outline" />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>{t('profile.log_out')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
          <Text style={[styles.deleteText, { color: colors.error }]}>
            {deleting ? t('profile.deleting') : t('profile.delete_account')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <View
          style={[
            styles.deleteConfirmBox,
            { backgroundColor: colors.surface, borderColor: withOpacity(colors.error, 0.25) },
          ]}
        >
          <Text style={[styles.deleteConfirmTitle, { color: colors.error }]}>{t('errors.delete_type_username')}</Text>
          <TextInput
            style={[
              styles.deleteInput,
              { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
            ]}
            value={deleteUsername}
            onChangeText={setDeleteUsername}
            placeholder={profile.username}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <View style={styles.deleteConfirmActions}>
            <TouchableOpacity
              style={[
                styles.deleteConfirmBtn,
                { backgroundColor: colors.error, opacity: deleteUsername === profile.username ? 1 : 0.4 },
              ]}
              onPress={confirmDelete}
              disabled={deleteUsername !== profile.username}
            >
              <Text style={styles.deleteConfirmBtnText}>{t('profile.delete_account')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowDeleteConfirm(false);
                setDeleteUsername('');
              }}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notifications */}
      <View style={[styles.supportSection, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => {
            haptic.light();
            router.push('/notifications');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{t('profile.notifications')}</Text>
          <Text style={[styles.supportValue, { color: colors.textMuted }]}>{'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {/* Support & Info */}
      <View style={[styles.supportSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.supportTitle, { color: colors.textMuted }]}>{t('profile.support_title')}</Text>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => Linking.openURL('mailto:hello@oneword.app')}
          activeOpacity={0.7}
        >
          <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{t('profile.contact_us')}</Text>
          <Text style={[styles.supportValue, { color: colors.textMuted }]}>hello@oneword.app</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => Linking.openURL(language === 'es' ? 'https://playoneword.app/es' : 'https://playoneword.app')}
          activeOpacity={0.7}
        >
          <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{t('profile.website')}</Text>
          <Text style={[styles.supportValue, { color: colors.textMuted }]}>playoneword.app</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() =>
            router.push({
              pathname: '/webview',
              params: {
                url: language === 'es' ? 'https://playoneword.app/es/privacy' : 'https://playoneword.app/privacy',
                title: t('profile.privacy_policy'),
              },
            })
          }
          activeOpacity={0.7}
        >
          <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{t('profile.privacy_policy')}</Text>
          <Text style={[styles.supportValue, { color: colors.textMuted }]}>{'\u2192'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() =>
            router.push({
              pathname: '/webview',
              params: {
                url: language === 'es' ? 'https://playoneword.app/es/terms' : 'https://playoneword.app/terms',
                title: t('profile.terms_of_use'),
              },
            })
          }
          activeOpacity={0.7}
        >
          <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{t('profile.terms_of_use')}</Text>
          <Text style={[styles.supportValue, { color: colors.textMuted }]}>{'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {/* Language – small, at the very bottom */}
      <View style={styles.langFooter}>
        <Text style={[styles.langFooterLabel, { color: colors.textMuted }]}>{t('profile.language')}</Text>
        <View style={styles.langFooterRow}>
          <TouchableOpacity onPress={() => handleLanguageSwitch('en')} activeOpacity={0.7}>
            <Text
              style={[
                styles.langFooterOption,
                language === 'en' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textMuted },
              ]}
            >
              English
            </Text>
          </TouchableOpacity>
          <Text style={[styles.langFooterDivider, { color: colors.textMuted }]}>|</Text>
          <TouchableOpacity onPress={() => handleLanguageSwitch('es')} activeOpacity={0.7}>
            <Text
              style={[
                styles.langFooterOption,
                language === 'es' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textMuted },
              ]}
            >
              Espa{'\u00F1'}ol
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  streakLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  badgeProgressSection: {
    marginBottom: spacing.lg,
  },
  tapToChange: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  username: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  memberSince: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  avatarPicker: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarOptionText: {
    fontSize: 28,
  },
  langFooter: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    gap: 4,
  },
  langFooterLabel: {
    fontSize: fontSize.xs - 1,
    letterSpacing: 1,
  },
  langFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langFooterOption: {
    fontSize: fontSize.xs,
  },
  langFooterDivider: {
    fontSize: fontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontFamily: 'DMMono_500Medium',
    fontWeight: '800',
    // fontFamily will gracefully fall back to system monospace if DMMono fails to load
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  deleteConfirmBox: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  deleteConfirmTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
    textAlign: 'center',
  },
  deleteConfirmActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteConfirmBtn: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  supportSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  supportTitle: {
    fontSize: fontSize.xs - 1,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  supportLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  supportValue: {
    fontSize: fontSize.xs,
  },
});
