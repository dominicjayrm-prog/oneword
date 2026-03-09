import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { searchUsers, sendFriendRequest, SEARCH_PAGE_SIZE, type UserSearchResult } from '../lib/friends';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  onRequestSent: () => void;
}

function SuccessToast({ visible, username, colors }: { visible: boolean; username: string; colors: any }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        timerRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 1800);
      });
    } else {
      opacity.setValue(0);
      scale.setValue(0.8);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastContainer,
        { opacity, transform: [{ scale }] },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
        <Text style={styles.toastEmoji}>{'\u2705'}</Text>
        <Text style={[styles.toastTitle, { color: colors.text }]}>{t('success.friend_sent')}</Text>
        <Text style={[styles.toastSubtitle, { color: colors.textMuted }]}>{t('success.friend_request_subtitle', { username })}</Text>
      </View>
    </Animated.View>
  );
}

export function AddFriendModal({ visible, onClose, currentUserId, onRequestSent }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [toastUser, setToastUser] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const doSearch = useCallback(async (text: string, offset = 0) => {
    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setHasMore(false);
      return;
    }
    if (offset === 0) setSearching(true);
    else setLoadingMore(true);

    const data = await searchUsers(text.trim(), currentUserId, offset);

    if (offset === 0) {
      setResults(data);
    } else {
      setResults((prev) => [...prev, ...data]);
    }
    setHasMore(data.length >= SEARCH_PAGE_SIZE);
    setSearching(false);
    setLoadingMore(false);
  }, [currentUserId]);

  function handleChangeText(text: string) {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(text), 300);
  }

  function handleLoadMore() {
    if (loadingMore || searching || !hasMore) return;
    doSearch(query, results.length);
  }

  async function handleSendRequest(userId: string, username: string) {
    haptic.medium();
    const { error } = await sendFriendRequest(currentUserId, userId);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setSentIds((prev) => new Set(prev).add(userId));
    setToastUser(username);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastUser(null), 2500);
    onRequestSent();
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    setSentIds(new Set());
    setHasMore(false);
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
                {'\uD83D\uDD25'} {t('game.day_streak', { count: item.current_streak })}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, buttonStyle]}
          onPress={() => handleSendRequest(item.user_id, item.username)}
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator style={styles.loadMoreSpinner} color={colors.primary} size="small" />
                ) : null
              }
            />
          )}
        </View>

        <SuccessToast visible={!!toastUser} username={toastUser ?? ''} colors={colors} />
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
    maxHeight: '50%',
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
  loadMoreSpinner: {
    paddingVertical: spacing.md,
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
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.xl + 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  toastTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  toastSubtitle: {
    fontSize: fontSize.sm,
  },
});
