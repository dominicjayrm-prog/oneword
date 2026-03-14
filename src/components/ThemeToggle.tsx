import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize } from '../constants/theme';
import { haptic } from '../lib/haptics';

export function ThemeToggle() {
  const { mode, toggleTheme, colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => {
        haptic.light();
        toggleTheme();
      }}
      style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, { color: colors.text }]}>{mode === 'light' ? '\u263E' : '\u2600'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  icon: {
    fontSize: fontSize.lg,
  },
});
