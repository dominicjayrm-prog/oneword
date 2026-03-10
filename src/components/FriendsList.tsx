import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { haptic } from '../lib/haptics';
import type { Friend } from '../lib/friends';

interface Props {
  friends: Friend[];
  onRemove: (friendshipId: string) => void;
  onAddPress: () => void;
}

export function FriendsList({ friends, onRemove, onAddPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  function handleRemove(friend: Friend) {
    haptic.warning();
    if (Platform.OS === 'web') {
      if (window.confirm(t('friends.remove_confirm'))) {
        onRemove(friend.friendship_id);
      }
    } else {
      Alert.alert(t('friends.remove_confirm_title'), t('friends.remove_confirm'), [
        { text: t('friends.decline'), style: 'cancel' },
        { text: t('friends.remove'), style: 'destructive', onPress: () => onRemove(friend.friendship_id) },
      ]);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('friends.your_friends')} ({friends.length})
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>+ {t('friends.add')}</Text>
        </TouchableOpacity>
      </View>

      {friends.map((friend) => (
        <TouchableOpacity
          key={friend.friendship_id}
          style={[styles.friendRow, { borderColor: colors.border }]}
          onLongPress={() => handleRemove(friend)}
          activeOpacity={0.7}
        >
          <View style={styles.friendInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
              <Text style={styles.avatarText}>{friend.friend_avatar_url || '\uD83C\uDFAD'}</Text>
            </View>
            <Text style={[styles.friendName, { color: colors.text }]}>@{friend.friend_username}</Text>
          </View>
          {friend.friend_current_streak > 0 && (
            <Text style={[styles.streak, { color: colors.primary }]}>
              {friend.friend_badge_emoji || '\uD83D\uDD25'} {t('game.day_streak', { count: friend.friend_current_streak })}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  addBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 16,
  },
  friendName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  streak: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
