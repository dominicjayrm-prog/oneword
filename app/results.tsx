import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useGame } from '../src/hooks/useGame';
import { useTheme } from '../src/contexts/ThemeContext';
import { WordDisplay } from '../src/components/WordDisplay';
import { LeaderboardRow } from '../src/components/LeaderboardRow';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { fontSize, spacing } from '../src/constants/theme';
import type { LeaderboardEntry } from '../src/types/database';

export default function ResultsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session, profile } = useAuth();
  const { todayWord, getLeaderboard } = useGame(session?.user?.id);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />
      {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
      <Text style={[styles.title, { color: colors.textMuted }]}>LEADERBOARD</Text>

      {leaderboard.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.empty, { color: colors.text }]}>No results yet.</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Vote more to see rankings!</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.description_id}
          renderItem={({ item }) => (
            <LeaderboardRow
              rank={item.rank}
              username={item.username}
              description={item.description_text}
              votes={item.votes}
              isCurrentUser={item.username === profile?.username}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.actions}>
        <Button title="BACK HOME" onPress={() => router.replace('/')} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xs,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  actions: {
    paddingBottom: spacing.xl,
  },
});
