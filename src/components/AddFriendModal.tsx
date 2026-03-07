import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { searchUsers, sendFriendRequest, type UserSearchResult } from '../lib/friends';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  onRequestSent: () => void;
}

export function AddFriendModal({ visible, onClose, currentUserId, onRequestSent }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const data = await searchUsers(text.trim(), currentUserId);
    setResults(data);
    setSearching(false);
  }, [currentUserId]);

  function handleChangeText(text: string) {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(text), 300);
  }

  async function handleSendRequest(userId: string) {
    const { error } = await sendFriendRequest(currentUserId, userId);
    if (error) {
      const msg = error.message;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      return;
    }
    setSentIds((prev) => new Set(prev).add(userId));
    onRequestSent();
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    setSentIds(new Set());
    onClose();
  }

  function renderResult({ item }: { item: UserSearchResult }) {
    const isSent = sentIds.has(item.user_id);

    let buttonLabel = t('friends.add');
    let buttonStyle: object = { backgroundColor: colors.primary };
    let textStyle: object = { color: '#FFFFFF' };
    let disabled = false;

    if (item.is_friend) {
      buttonLabel = t('friends.already_friends') + ' \u2713';
      buttonStyle = { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.success };
      textStyle = { color: colors.success };
      disabled = true;
    } else if (item.request_pending || isSent) {
      buttonLabel = t('friends.pending');
      buttonStyle = { backgroundColor: colors.textMuted + '30' };
      textStyle = { color: colors.textMuted };
      disabled = true;
    }

    return (
      <View style={[styles.resultRow, { borderColor: colors.border }]}>
        <View style={styles.resultInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <Text style={styles.avatarText}>{item.avatar_url || '\uD83C\uDFAD'}</Text>
          </View>
          <View style={styles.resultNameCol}>
            <Text style={[styles.resultName, { color: colors.text }]}>@{item.username}</Text>
            {item.current_streak > 0 && (
              <Text style={[styles.resultStreak, { color: colors.textMuted }]}>
                {'\uD83D\uDD25'} {item.current_streak} day streak
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, buttonStyle]}
          onPress={() => handleSendRequest(item.user_id)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, textStyle]}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('friends.add_friends')}</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder={t('friends.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleChangeText}
            autoCapitalize="none"
            autoFocus
          />

          {searching ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.user_id}
              renderItem={renderResult}
              contentContainerStyle={styles.resultsList}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
    minHeight: '50%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 22,
    fontWeight: '600',
    padding: spacing.xs,
  },
  searchInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  resultsList: {
    paddingBottom: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultInfo: {
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
  resultNameCol: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  resultStreak: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  actionBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  actionBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
