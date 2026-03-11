import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentBadge, getNextBadge, getProgressToNext } from '../lib/badges';
import { fontSize, spacing, borderRadius, withOpacity } from '../constants/theme';

interface BadgeProgressProps {
  streak: number;
}

export function BadgeProgress({ streak }: BadgeProgressProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const current = getCurrentBadge(streak);
  const next = getNextBadge(streak);
  const progress = getProgressToNext(streak);

  // Final badge reached
  if (current && !next) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.maxText, { color: current.color }]}>
          {current.emoji} {t('badges.eternal')} — {t('badges.highest_tier')}
        </Text>
      </View>
    );
  }

  // No badge yet
  if (!current && next) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('badges.no_badge', { count: next.streak - streak })}
        </Text>
        <View style={[styles.barBg, { backgroundColor: withOpacity(colors.text, 0.08) }]}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: next.color }]} />
        </View>
      </View>
    );
  }

  // Has a badge with a next tier
  if (current && next) {
    const daysLeft = next.streak - streak;
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.nextLabel, { color: colors.textSecondary }]}>
          {t('badges.next_milestone')}
        </Text>
        <Text style={[styles.nextBadge, { color: colors.text }]}>
          {next.emoji} {next.name} — {t('badges.days_to_go', { count: daysLeft })}
        </Text>
        <View style={[styles.barBg, { backgroundColor: withOpacity(colors.text, 0.08) }]}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: current.color }]} />
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  nextLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextBadge: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  maxText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  barBg: {
    height: 3,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
