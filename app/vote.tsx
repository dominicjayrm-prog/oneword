import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useGameContext } from '../src/contexts/GameContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { WordDisplay } from '../src/components/WordDisplay';
import { VoteCard } from '../src/components/VoteCard';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { fontSize, spacing } from '../src/constants/theme';
import type { VotePair } from '../src/types/database';

const MAX_VOTES = 15;

export default function VoteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const { todayWord, getVotePair, submitVote, reportDescription } = useGameContext();

  const [pair, setPair] = useState<VotePair | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noMorePairs, setNoMorePairs] = useState(false);

  const loadPair = useCallback(async () => {
    setLoading(true);
    const p = await getVotePair();
    if (!p) {
      setNoMorePairs(true);
    }
    setPair(p);
    setLoading(false);
  }, [getVotePair]);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  async function handleVote(winnerId: string, loserId: string) {
    await submitVote(winnerId, loserId);
    const newCount = voteCount + 1;
    setVoteCount(newCount);

    if (newCount >= MAX_VOTES) {
      setNoMorePairs(true);
      return;
    }

    loadPair();
  }

  async function handleReport(descriptionId: string) {
    Alert.alert(
      'Report Description',
      'Flag this description as inappropriate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            await reportDescription(descriptionId);
            Alert.alert('Reported', 'Thanks for helping keep OneWord clean.');
            loadPair();
          },
        },
      ]
    );
  }

  if (noMorePairs || voteCount >= MAX_VOTES) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.doneTitle, { color: colors.text }]}>
            {voteCount >= MAX_VOTES ? 'Voting Complete!' : 'No More Pairs'}
          </Text>
          <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
            You voted on {voteCount} pair{voteCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="SEE RESULTS" onPress={() => router.replace('/results')} />
          <Button title="BACK HOME" onPress={() => router.replace('/')} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />
      <View style={styles.header}>
        {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {voteCount + 1} of {MAX_VOTES}
        </Text>
        <Text style={[styles.instruction, { color: colors.textMuted }]}>Tap the one you prefer</Text>
      </View>

      <View style={styles.pairContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : !pair ? (
          <View style={styles.noPairs}>
            <Text style={[styles.doneTitle, { color: colors.text }]}>No pairs available yet</Text>
            <Button title="BACK HOME" onPress={() => router.replace('/')} variant="outline" />
          </View>
        ) : (
          <>
            <VoteCard
              description={pair.desc1_text}
              onPress={() => handleVote(pair.desc1_id, pair.desc2_id)}
              onReport={() => handleReport(pair.desc1_id)}
            />
            <Text style={[styles.vs, { color: colors.textMuted }]}>VS</Text>
            <VoteCard
              description={pair.desc2_text}
              onPress={() => handleVote(pair.desc2_id, pair.desc1_id)}
              onReport={() => handleReport(pair.desc2_id)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
  },
  progress: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  instruction: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  pairContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  vs: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 4,
  },
  noPairs: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  doneTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  doneSubtitle: {
    fontSize: fontSize.md,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
