import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
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

const AVATARS = ['🎭', '🦊', '🐙', '🌟', '🎨', '🔥', '💎', '🌙', '🦄', '🍕', '🎯', '🧊', '🪐', '🎸', '🌊', '🦅'];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, signOut, updateAvatar, deleteAccount } = useAuthContext();
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

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  async function handleAvatarSelect(emoji: string) {
    await updateAvatar(emoji);
    setShowAvatarPicker(false);
  }

  async function handleLogout() {
    const ok = await confirm('Log Out', 'Are you sure you want to log out?');
    if (ok) {
      signOut();
    }
  }

  async function handleDeleteAccount() {
    const ok = await confirm('Delete Account', 'This will permanently delete your account and all your data. This cannot be undone.');
    if (!ok) return;

    const really = await confirm('Are you absolutely sure?', 'All your descriptions, votes, and stats will be gone forever.');
    if (!really) return;

    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to delete account. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
      setDeleting(false);
    }
  }

  const stats = [
    { label: 'Current Streak', value: `${profile.current_streak}`, icon: '🔥' },
    { label: 'Best Streak', value: `${profile.longest_streak}`, icon: '⭐' },
    { label: 'Total Plays', value: `${profile.total_plays}`, icon: '🎮' },
    { label: 'Votes Received', value: `${profile.total_votes_received}`, icon: '👍' },
    { label: 'Best Rank', value: profile.best_rank ? `#${profile.best_rank}` : '-', icon: '🏆' },
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
          <Text style={styles.avatarText}>{profile.avatar_url || '🎭'}</Text>
        </TouchableOpacity>
        <Text style={[styles.tapToChange, { color: colors.textMuted }]}>Tap to change</Text>

        <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
        <Text style={[styles.memberSince, { color: colors.textMuted }]}>Member since {memberSince}</Text>
      </View>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <View style={[styles.avatarPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.textSecondary }]}>CHOOSE AVATAR</Text>
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
        <Button title="BACK HOME" onPress={() => router.replace('/')} variant="outline" />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
          <Text style={[styles.deleteText, { color: colors.error }]}>
            {deleting ? 'Deleting...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>
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
