import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { getPendingRequests } from '../../src/lib/friends';
import { haptic } from '../../src/lib/haptics';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={styles.tabIcon}>{emoji}</Text>;
}

function BadgeIcon({ emoji, count }: { emoji: string; count: number }) {
  return (
    <View>
      <Text style={styles.tabIcon}>{emoji}</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function GameLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    getPendingRequests(session.user.id).then((requests) => {
      setPendingCount(requests.length);
    }).catch(() => {});
    const interval = setInterval(() => {
      getPendingRequests(session.user.id).then((requests) => {
        setPendingCount(requests.length);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 4);
  const isLoggedIn = !!session;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          haptic.selection();
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isLoggedIn
          ? {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingBottom: bottomPad,
              paddingTop: 6,
              minHeight: 56 + bottomPad,
            }
          : { display: 'none' },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: () => <TabIcon emoji={'\uD83C\uDF0D'} />,
        }}
      />
      <Tabs.Screen
        name="vote"
        options={{
          title: t('tabs.vote'),
          tabBarIcon: () => <TabIcon emoji={'\uD83D\uDDF3\uFE0F'} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: t('tabs.results'),
          tabBarIcon: () => <TabIcon emoji={'\uD83C\uDFC6'} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: t('friends.tab_title'),
          tabBarIcon: () => <BadgeIcon emoji={'\uD83D\uDC65'} count={pendingCount} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
