import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { fontSize, spacing, borderRadius } from '../src/constants/theme';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}

const AVATARS = ['\uD83C\uDFAD', '\uD83E\uDD8A', '\uD83D\uDC19', '\uD83C\uDF1F', '\uD83C\uDFA8', '\uD83D\uDD25', '\uD83D\uDC8E', '\uD83C\uDF19', '\uD83E\uDD84', '\uD83C\uDF55', '\uD83C\uDFAF', '\uD83E\uDDCA', '\uD83E\uDE90', '\uD83C\uDFB8', '\uD83C\uDF0A', '\uD83E\uDD85'];

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile, signOut, updateAvatar, updateLanguage, deleteAccount, language } = useAuthContext();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) {
      router.replace('/');
    }
  }, [profile]);

  if (!profile) {
    return null;
  }

  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const memberSince = new Date(profile.created_at).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  async function handleAvatarSelect(emoji: string) {
    await updateAvatar(emoji);
    setShowAvatarPicker(false);
  }

  async function handleLanguageSwitch(lang: string) {
    await updateLanguage(lang);
  }

  async function handleLogout() {
    const ok = await confirm(t('profile.log_out_title'), t('profile.log_out_message'));
    if (ok) {
      signOut();
    }
  }

  async function handleDeleteAccount() {
    const ok = await confirm(t('profile.delete_title'), t('profile.delete_message'));
    if (!ok) return;

    const really = await confirm(t('profile.delete_confirm_title'), t('profile.delete_confirm_message'));
    if (!really) return;

    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      if (Platform.OS === 'web') {
        window.alert(t('profile.delete_error'));
      } else {
        Alert.alert('Error', t('profile.delete_error'));
      }
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
          onPress={() => setShowAvatarPicker(!showAvatarPicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText}>{profile.avatar_url || '\uD83C\uDFAD'}</Text>
        </TouchableOpacity>
        <Text style={[styles.tapToChange, { color: colors.textMuted }]}>{t('profile.tap_to_change')}</Text>

        <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
        <Text style={[styles.memberSince, { color: colors.textMuted }]}>
          {t('profile.member_since', { date: memberSince })}
        </Text>
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
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

      {/* Language – small, at the very bottom */}
      <View style={styles.langFooter}>
        <Text style={[styles.langFooterLabel, { color: colors.textMuted }]}>{t('profile.language')}</Text>
        <View style={styles.langFooterRow}>
          <TouchableOpacity onPress={() => handleLanguageSwitch('en')} activeOpacity={0.7}>
            <Text style={[styles.langFooterOption, language === 'en' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textMuted }]}>
              English
            </Text>
          </TouchableOpacity>
          <Text style={[styles.langFooterDivider, { color: colors.textMuted }]}>|</Text>
          <TouchableOpacity onPress={() => handleLanguageSwitch('es')} activeOpacity={0.7}>
            <Text style={[styles.langFooterOption, language === 'es' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textMuted }]}>
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
});
