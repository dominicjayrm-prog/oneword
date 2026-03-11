import { View, StyleSheet, Platform } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const MAX_WIDTH = 430;

export function MobileContainer({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { backgroundColor: colors.background }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
  },
});
