import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../src/contexts/ThemeContext';
import { fontSize, spacing } from '../src/constants/theme';

let WebView: typeof import('react-native-webview').default | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require('react-native-webview').default;
}

const INJECTED_JS = `
(function() {
  var selectors = ['nav', 'header', 'footer', '.navbar', '.site-header', '.site-footer'];
  selectors.forEach(function(s) {
    document.querySelectorAll(s).forEach(function(el) { el.style.display = 'none'; });
  });
  document.body.style.paddingTop = '0px';
  true;
})();
`;

const ALLOWED_HOSTS = ['playoneword.app', 'www.playoneword.app'];

function isAllowedUrl(urlStr: string | undefined): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const safeUrl = isAllowedUrl(url) ? url : undefined;

  if (!safeUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title || ''}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.webFallback}>
          <Text style={[styles.webFallbackText, { color: colors.textSecondary }]}>
            This link cannot be opened in-app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title || ''}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.webFallback}>
          <Text style={[styles.webFallbackText, { color: colors.textSecondary }]}>
            Visit: <Text style={{ color: colors.primary }}>{safeUrl}</Text>
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title || ''}
        </Text>
        <View style={styles.backButton} />
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      {WebView && (
        <WebView
          source={{ uri: safeUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          injectedJavaScript={INJECTED_JS}
          javaScriptEnabled
          startInLoadingState={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 70,
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  webview: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  webFallbackText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
