import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { FavouriteCard } from '../src/components/FavouriteCard';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { supabase } from '../src/lib/supabase';
import { haptic } from '../src/lib/haptics';
import { fontSize, spacing, borderRadius } from '../src/constants/theme';

interface FavouriteEntry {
  favourite_id: string;
  description_id: string;
  description_text: string;
  word: string;
  word_date: string;
  author_username: string;
  author_id: string;
  vote_count: number;
  rank: number | null;
  is_own: boolean;
  saved_at: string;
}

export default function FavouritesScreen() {
  const router = useRouter();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();

  const [tab, setTab] = useState<'mine' | 'community'>(initialTab === 'community' ? 'community' : 'mine');
  const [favourites, setFavourites] = useState<FavouriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.rpc('get_favourites', {
        p_user_id: session.user.id,
      });
      if (!error && data) {
        setFavourites(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const mine = favourites.filter((f) => f.is_own);
  const community = favourites.filter((f) => !f.is_own);
  const current = tab === 'mine' ? mine : community;

  const handleRemoved = (id: string) => {
    setFavourites((prev) => prev.filter((f) => f.favourite_id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.back, { color: colors.textMuted }]}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {'\u2665'} {t('favourites.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab toggle */}
      <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.toggleTab, tab === 'mine' && { backgroundColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            setTab('mine');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, { color: tab === 'mine' ? '#FFFFFF' : colors.textMuted }]}>
            {t('favourites.mine')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTab, tab === 'community' && { backgroundColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            setTab('community');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, { color: tab === 'community' ? '#FFFFFF' : colors.textMuted }]}>
            {t('favourites.community')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingSpinner />
        </View>
      ) : current.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
            {tab === 'mine' ? t('favourites.emptyMine') : t('favourites.emptyCommunity')}{' '}
            <Text style={{ color: colors.primary }}>{'\u2665'}</Text>
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {tab === 'mine' ? t('favourites.emptyMineSubtitle') : t('favourites.emptyCommunitySubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.favourite_id}
          renderItem={({ item }) => (
            <FavouriteCard
              word={item.word}
              wordDate={item.word_date}
              description={item.description_text}
              authorUsername={item.author_username}
              rank={item.rank}
              votes={item.vote_count}
              descriptionId={item.description_id}
              showAuthor={tab === 'community'}
              onRemoved={() => handleRemoved(item.favourite_id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  back: {
    fontSize: fontSize.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.lg,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
