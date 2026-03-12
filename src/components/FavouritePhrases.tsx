import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FavouriteCard } from './FavouriteCard';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';
import { fontSize, spacing, borderRadius } from '../constants/theme';

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

interface Props {
  onSeeAll?: (tab: 'mine' | 'community') => void;
}

export function FavouritePhrases({ onSeeAll }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const [favourites, setFavourites] = useState<FavouriteEntry[]>([]);
  const [tab, setTab] = useState<'mine' | 'community'>('mine');
  const [loaded, setLoaded] = useState(false);

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
      setLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const mine = favourites.filter((f) => f.is_own);
  const community = favourites.filter((f) => !f.is_own);
  const current = tab === 'mine' ? mine : community;
  const preview = current.slice(0, 3);
  const totalCount = current.length;

  const handleRemoved = (id: string) => {
    setFavourites((prev) => prev.filter((f) => f.favourite_id !== id));
  };

  if (!loaded) return null;
  if (favourites.length === 0 && loaded) {
    // Show section with empty state for discoverability
  }

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {'\u2665'} {t('favourites.title')}
      </Text>

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

      {/* Empty state */}
      {current.length === 0 && (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
            {tab === 'mine' ? t('favourites.emptyMine') : t('favourites.emptyCommunity')}{' '}
            <Text style={{ color: colors.primary }}>{'\u2665'}</Text>
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {tab === 'mine' ? t('favourites.emptyMineSubtitle') : t('favourites.emptyCommunitySubtitle')}
          </Text>
        </View>
      )}

      {/* Preview cards */}
      {preview.map((f) => (
        <FavouriteCard
          key={f.favourite_id}
          word={f.word}
          wordDate={f.word_date}
          description={f.description_text}
          authorUsername={f.author_username}
          rank={f.rank}
          votes={f.vote_count}
          descriptionId={f.description_id}
          showAuthor={tab === 'community'}
          onRemoved={() => handleRemoved(f.favourite_id)}
        />
      ))}

      {/* See all link */}
      {totalCount > 3 && (
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            onSeeAll?.(tab);
          }}
          style={styles.seeAll}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            {t('favourites.seeAll')} ({totalCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
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
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  seeAll: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
