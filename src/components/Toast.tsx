import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    toastId += 1;
    setToast({ id: toastId, text, type });
  }, []);

  const handleDismiss = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastBanner key={toast.id} toast={toast} onDismiss={handleDismiss} />}
    </ToastContext.Provider>
  );
}

function ToastBanner({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === 'web' ? 16 : Math.max(insets.top, 16);

  const bgColors: Record<ToastType, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.secondary,
  };

  useEffect(() => {
    let dismissed = false;

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        if (!dismissed) onDismiss();
      });
    }, 3000);

    return () => {
      dismissed = true;
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { top: topOffset, backgroundColor: bgColors[toast.type], opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.bannerText}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
});
