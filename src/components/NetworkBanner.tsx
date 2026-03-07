import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, borderRadius } from '../constants/theme';

export function NetworkBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -60,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { transform: [{ translateY }] }]}
    >
      <Text style={styles.text}>{t('errors.network')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 0 : 44,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B4A',
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
