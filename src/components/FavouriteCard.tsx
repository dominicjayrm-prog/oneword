import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FavouriteButton } from './FavouriteButton';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface FavouriteCardProps {
  word: string;
  wordDate: string;
  description: string;
  authorUsername?: string;
  rank?: number | null;
  votes: number;
  descriptionId: string;
  showAuthor?: boolean;
  onRemoved?: () => void;
}

export function FavouriteCard({
  word,
  wordDate,
  description,
  authorUsername,
  rank,
  votes,
  descriptionId,
  showAuthor = true,
  onRemoved,
}: FavouriteCardProps) {
  const { colors } = useTheme();

  const dateStr = wordDate
    ? new Date(wordDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.word, { color: colors.text }]}>{word.toUpperCase()}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr}</Text>
      </View>
      <Text style={[styles.description, { color: colors.text }]}>
        {'\u201C'}
        {description}
        {'\u201D'}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {showAuthor && authorUsername ? `@${authorUsername} \u00B7 ` : ''}
          {rank ? `#${rank} \u00B7 ` : ''}
          {votes} votes
        </Text>
        <FavouriteButton
          descriptionId={descriptionId}
          isFavourited={true}
          onToggle={(fav) => {
            if (!fav) onRemoved?.();
          }}
          size={14}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  word: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  date: {
    fontSize: 10,
    fontFamily: 'DMMono_500Medium',
  },
  description: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    fontSize: 11,
    flex: 1,
  },
});
