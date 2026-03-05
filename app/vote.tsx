import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useGame } from '../src/hooks/useGame';
import { WordDisplay } from '../src/components/WordDisplay';
import { VoteCard } from '../src/components/VoteCard';
import { Button } from '../src/components/Button';
import { colors, fontSize, spacing } from '../src/constants/theme';
import type { VotePair } from '../src/types/database';

const MAX_VOTES = 15;

export default function VoteScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { todayWord, getVotePair, submitVote } = useGame(session?.user?.id);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (noMorePairs || voteCount >= MAX_VOTES) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.doneTitle}>
            {voteCount >= MAX_VOTES ? 'Voting Complete!' : 'No More Pairs'}
          </Text>
          <Text style={styles.doneSubtitle}>
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

  if (!pair) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>No pairs available yet</Text>
        <Button title="BACK HOME" onPress={() => router.replace('/')} variant="outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
        <Text style={styles.progress}>
          {voteCount + 1} of {MAX_VOTES}
        </Text>
        <Text style={styles.instruction}>Tap the one you prefer</Text>
      </View>

      <View style={styles.pairContainer}>
        <VoteCard
          description={pair.desc1_text}
          onPress={() => handleVote(pair.desc1_id, pair.desc2_id)}
        />
        <Text style={styles.vs}>VS</Text>
        <VoteCard
          description={pair.desc2_text}
          onPress={() => handleVote(pair.desc2_id, pair.desc1_id)}
        />
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
  header: {
    alignItems: 'center',
  },
  progress: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  instruction: {
    fontSize: fontSize.md,
    color: colors.textMuted,
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
    color: colors.textMuted,
    letterSpacing: 4,
  },
  doneTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  doneSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
