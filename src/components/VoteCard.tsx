import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface VoteCardProps {
  description: string;
  onPress: () => void;
  onReport: () => void;
  disabled?: boolean;
}

export function VoteCard({ description, onPress, onReport, disabled }: VoteCardProps) {
  const { colors } = useTheme();

  return (
    <View style={disabled ? { opacity: 0.6 } : undefined}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={[styles.text, { color: colors.text }]}>{description}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reportButton}
        onPress={onReport}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.reportText, { color: colors.textMuted }]}>Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },
  reportButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
  },
  reportText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
