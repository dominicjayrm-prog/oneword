import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getRankEmoji, formatDescription } from '../lib/format';
import { getCurrentBadge } from '../lib/badges';

interface ShareCardProps {
  word: string;
  description: string | null;
  rank: number | null;
  votes: number | null;
  streak: number;
}

export const ShareCard = forwardRef<View, ShareCardProps>(({ word, description, rank, votes, streak }, ref) => {
  const { t } = useTranslation();
  const rankEmoji = getRankEmoji(rank);
  const badge = getCurrentBadge(streak);
  const streakIcon = badge ? badge.emoji : '\u{1F525}';

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Gradient background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgOverlay} />

      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoOne}>one</Text>
        <Text style={styles.logoWord}>word</Text>
      </View>

      {/* Today's word label */}
      <Text style={styles.label}>{t('share.todays_word')}</Text>

      {/* Hero word */}
      <Text style={styles.heroWord}>{word}</Text>

      {/* Decorative underline */}
      <View style={styles.underline} />

      {/* Description container */}
      {description && (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>
            {'\u201C'}
            {formatDescription(description)}
            {'\u201D'}
          </Text>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statEmoji}>{rankEmoji}</Text>
          <Text style={styles.statNumber}>{rank ?? '-'}</Text>
          <Text style={styles.statLabel}>{t('share.rank')}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statNumber}>{votes ?? 0}</Text>
          <Text style={styles.statLabel}>{t('share.votes')}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statEmoji}>{streakIcon}</Text>
          <Text style={styles.statNumber}>{streak}</Text>
          <Text style={styles.statLabel}>{t('share.streak')}</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>{t('share.play_daily')}</Text>
    </View>
  );
});

// Card rendered at 4:5 ratio (Instagram-friendly). Captured at higher res.
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
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'DMSans_500Medium',
    marginBottom: 6,
  },
  heroWord: {
    fontSize: 48,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  underline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF6B4A',
    marginTop: 8,
    marginBottom: 16,
  },
  descriptionBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'DMMono_500Medium',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'DMSans_500Medium',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 1,
  },
});
