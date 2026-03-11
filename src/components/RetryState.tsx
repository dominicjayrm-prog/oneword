import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface Props {
  type: 'offline' | 'error';
  onRetry: () => void;
}

export function RetryState({ type, onRetry }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{type === 'offline' ? '\uD83D\uDCE1' : '\uD83D\uDE35'}</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        {type === 'offline' ? t('offline.no_connection') : t('offline.something_wrong')}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {type === 'offline' ? t('offline.check_connection') : t('offline.try_again_message')}
      </Text>
      <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>{t('offline.try_again')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: 'DMSans_400Regular',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontFamily: 'DMSans_700Bold',
    fontWeight: '700',
    color: '#FFF',
    fontSize: fontSize.sm,
  },
});
