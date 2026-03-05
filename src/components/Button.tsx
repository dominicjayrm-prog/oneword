import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'outline' && styles.outlineText,
            disabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  outlineText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textSecondary,
  },
});
