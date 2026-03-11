import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../contexts/NetworkContext';
import { fontSize, spacing } from '../constants/theme';

export function NetworkBanner() {
  const { t } = useTranslation();
  const { isOnline, isReconnecting } = useNetwork();
  const translateY = useRef(new Animated.Value(-60)).current;

  const visible = !isOnline || isReconnecting;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -60,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { transform: [{ translateY }], backgroundColor: isReconnecting ? '#2ECC71' : '#FF6B4A' },
      ]}
    >
      <Text style={styles.text}>
        {isReconnecting
          ? t('offline.reconnected')
          : t('offline.no_connection')
        }
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 0 : 44,
    left: 0,
    right: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    zIndex: 10000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
});
