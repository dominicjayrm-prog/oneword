import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { haptic } from '../lib/haptics';
import type { PendingRequest } from '../lib/friends';

interface Props {
  requests: PendingRequest[];
  onAccept: (friendshipId: string) => void;
  onDecline: (friendshipId: string) => void;
}

export function FriendRequests({ requests, onAccept, onDecline }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (requests.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
      <Text style={[styles.title, { color: colors.primary }]}>
        {t('friends.requests')} ({requests.length})
      </Text>

      {requests.map((req) => (
        <View key={req.friendship_id} style={[styles.requestRow, { borderColor: colors.border }]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
              <Text style={styles.avatarText}>{req.requester_avatar_url || '\uD83C\uDFAD'}</Text>
            </View>
            <View style={styles.nameCol}>
              <Text style={[styles.username, { color: colors.text }]}>@{req.requester_username}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              onPress={() => { haptic.success(); onAccept(req.friendship_id); }}
              activeOpacity={0.7}
            >
              <Text style={styles.acceptText}>{t('friends.accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { haptic.light(); onDecline(req.friendship_id); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.declineText, { color: colors.textMuted }]}>{t('friends.decline')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
  },
  nameCol: {
    flex: 1,
  },
  username: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  declineText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
