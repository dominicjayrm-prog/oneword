import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useGame } from '../src/hooks/useGame';
import { WordDisplay } from '../src/components/WordDisplay';
import { LeaderboardRow } from '../src/components/LeaderboardRow';
import { Button } from '../src/components/Button';
import { colors, fontSize, spacing } from '../src/constants/theme';
import type { LeaderboardEntry } from '../src/types/database';

export default function ResultsScreen() {
  const router = useRouter();
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
      <Text style={styles.title}>LEADERBOARD</Text>

      {leaderboard.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No results yet.</Text>
          <Text style={styles.emptySub}>Vote more to see rankings!</Text>
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  actions: {
    paddingBottom: spacing.xl,
  },
});
