import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../constants/theme';

interface VoteCardProps {
  description: string;
  onPress: () => void;
}

export function VoteCard({ description, onPress }: VoteCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.text}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },
});
