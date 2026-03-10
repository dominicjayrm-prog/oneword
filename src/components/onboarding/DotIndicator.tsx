import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface DotIndicatorProps {
  total: number;
  current: number;
}

export function DotIndicator({ total, current }: DotIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i === current} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const width = useRef(new Animated.Value(active ? 24 : 8)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: active ? 24 : 8,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? colors.primary : colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
