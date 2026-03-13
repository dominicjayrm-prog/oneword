import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getRankEmoji, formatDescription } from '../lib/format';
import { getCurrentBadge } from '../lib/badges';
import type { WeeklyRecap } from '../types/database';

interface Props {
  data: WeeklyRecap;
  dateRange: string;
}

export const WeeklyRecapShareCard = forwardRef<View, Props>(({ data, dateRange }, ref) => {
  const { t } = useTranslation();
  const rankEmoji = getRankEmoji(data.best_rank);

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={styles.bgBase} />
      <View style={styles.bgOverlay} />

      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoOne}>one</Text>
        <Text style={styles.logoWord}>word</Text>
      </View>

      {/* Label */}
      <Text style={styles.label}>{t('weekly_recap.label')}</Text>
      <Text style={styles.dateRange}>{dateRange}</Text>

      {/* Best description */}
      {data.best_rank_word && data.best_rank_description && (
        <View style={styles.bestBox}>
          <Text style={styles.bestWord}>{data.best_rank_word.toUpperCase()}</Text>
          <Text style={styles.bestDesc}>
            {'\u201C'}
            {formatDescription(data.best_rank_description)}
            {'\u201D'}
          </Text>
          <Text style={styles.bestRank}>
            {rankEmoji} #{data.best_rank}
          </Text>
        </View>
      )}

      {/* Stats line */}
      <Text style={styles.statsLine}>
        {data.days_played}/7 days {'\u00B7'} {data.total_votes_received} votes {'\u00B7'}{' '}
        {getCurrentBadge(data.current_streak)?.emoji || '\uD83D\uDD25'} {data.current_streak} streak
      </Text>

      {/* Footer */}
      <Text style={styles.footer}>playoneword.app</Text>
    </View>
  );
});

const CARD_WIDTH = 320;
const CARD_HEIGHT = 400;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A2E',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2D1B69',
    opacity: 0.55,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  logoOne: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#FFFFFF',
  },
  logoWord: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#FF6B4A',
  },
  label: {
    fontSize: 10,
    letterSpacing: 4,
    color: '#FF6B4A',
    fontFamily: 'DMSans_500Medium',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'DMSans_400Regular',
    marginBottom: 16,
  },
  bestBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 6,
  },
  bestWord: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  bestDesc: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  bestRank: {
    fontSize: 14,
    color: '#FF6B4A',
    fontFamily: 'DMMono_500Medium',
  },
  statsLine: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 1,
  },
});
