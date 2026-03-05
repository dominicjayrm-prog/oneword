import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface VoteCardProps {
  description: string;
  onPress: () => void;
}

export function VoteCard({ description, onPress }: VoteCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.text, { color: colors.text }]}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },
});
