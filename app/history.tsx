import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { haptic } from '../src/lib/haptics';
import { formatDescription } from '../src/lib/format';
import { withOpacity } from '../src/constants/theme';
import {
  getMonthHistory,
  computeMonthStats,
  getPlayedDates,
  getAllTimeBestRank,
  type HistoryEntry,
  type MonthStats,
} from '../src/lib/history';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_HEADERS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const APP_LAUNCH_DATE = new Date(2026, 2, 20); // March 20, 2026

export default function HistoryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { session, profile, language } = useAuthContext();
  const userId = session?.user?.id;
  const isEs = i18n.language === 'es';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<MonthStats>({ words_played: 0, best_rank: null, avg_rank: null });
  const [allTimeBest, setAllTimeBest] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardRefs = useRef<Map<string, number>>(new Map());

  const monthNames = isEs ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const dayHeaders = isEs ? DAY_HEADERS_ES : DAY_HEADERS;

  const loadMonth = useCallback(
    async (showLoading = true) => {
      if (!userId) return;
      if (showLoading) setLoading(true);
      try {
        const data = await getMonthHistory(userId, year, month, language);
        setEntries(data);
        setStats(computeMonthStats(data));
      } catch (err) {
        console.warn('[HistoryScreen] Failed to load:', err);
      }
      if (showLoading) setLoading(false);
    },
    [userId, year, month, language],
  );

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    if (!userId) return;
    getAllTimeBestRank(userId).then(setAllTimeBest);
  }, [userId]);

  const handleRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await loadMonth(false);
    setRefreshing(false);
  }, [loadMonth]);

  const playedDates = useMemo(() => getPlayedDates(entries), [entries]);

  const canGoBack = year > 2026 || (year === 2026 && month > 3);
  const canGoForward = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);

  function goBack() {
    if (!canGoBack) return;
    haptic.light();
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function goForward() {
    if (!canGoForward) return;
    haptic.light();
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  function scrollToCard(date: string) {
    const yPos = cardRefs.current.get(date);
    if (yPos != null && scrollRef.current) {
      haptic.light();
      scrollRef.current.scrollTo({ y: yPos - 200, animated: true });
    }
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const cells: Array<{ day: number | null; dateStr: string; played: boolean; isToday: boolean; isFuture: boolean }> =
      [];

    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: '', played: false, isToday: false, isFuture: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, d);
      const isFuture = dateObj > now;
      const isBeforeLaunch = dateObj < APP_LAUNCH_DATE;
      const played = !isFuture && !isBeforeLaunch && playedDates.has(dateStr);
      const isToday = dateStr === todayStr;

      cells.push({ day: d, dateStr, played, isToday, isFuture });
    }

    return cells;
  }, [year, month, playedDates]);

  const formatDatePill = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const monthShort = isEs
      ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][d.getMonth()]
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return `${monthShort} ${d.getDate()}`;
  };

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  const hasAnyHistory = entries.length > 0 || year !== 2026 || month !== 3;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>
            {'\u2190'} {t('nav_back')}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t('history.title')}</Text>
        </View>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} disabled={!canGoBack}>
          <Text style={[styles.monthArrow, { color: canGoBack ? colors.text : colors.border }]}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.textMuted }]}>
          {monthNames[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={goForward} activeOpacity={0.7} disabled={!canGoForward}>
          <Text style={[styles.monthArrow, { color: canGoForward ? colors.text : colors.border }]}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: 'rgba(26,26,46,0.06)' }]}>
          <Text style={styles.statLabel}>{t('history.words_played')}</Text>
          <Text style={[styles.statValue, { color: '#1A1A2E' }]}>{stats.words_played}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(26,26,46,0.06)' }]}>
          <Text style={styles.statLabel}>{t('history.best_rank')}</Text>
          <Text style={[styles.statValue, { color: '#FF6B4A' }]}>
            {stats.best_rank ? `#${stats.best_rank}` : '\u2014'}
          </Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(26,26,46,0.06)' }]}>
          <Text style={styles.statLabel}>{t('history.avg_rank')}</Text>
          <Text style={[styles.statValue, { color: '#1A1A2E' }]}>
            {stats.avg_rank ? `#${stats.avg_rank}` : '\u2014'}
          </Text>
        </View>
      </View>

      {/* Mini Calendar */}
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          {dayHeaders.map((d, i) => (
            <Text key={i} style={styles.calendarDayHeader}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((cell, i) => {
            if (cell.day === null) {
              return <View key={`empty-${i}`} style={styles.calendarCell} />;
            }
            if (cell.isFuture) {
              return <View key={`future-${i}`} style={styles.calendarCell} />;
            }

            const played = cell.played;
            return (
              <TouchableOpacity
                key={cell.dateStr}
                style={[
                  styles.calendarCell,
                  {
                    backgroundColor: played ? 'rgba(255,107,74,0.12)' : 'rgba(139,134,151,0.08)',
                  },
                  cell.isToday && { borderWidth: 1.5, borderColor: '#FF6B4A' },
                ]}
                onPress={played ? () => scrollToCard(cell.dateStr) : undefined}
                activeOpacity={played ? 0.7 : 1}
                disabled={!played}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    { color: played ? '#FF6B4A' : '#C4C0CE', fontWeight: played ? '600' : '400' },
                  ]}
                >
                  {cell.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section Divider */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionLabel}>{t('history.recent_words')}</Text>
        <View style={[styles.sectionLine, { backgroundColor: withOpacity(colors.textMuted, 0.2) }]} />
      </View>

      {/* Word Cards or Empty State */}
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {hasAnyHistory ? t('history.empty_no_words') : t('history.empty_first_title')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {hasAnyHistory ? t('history.empty_words_appear') : t('history.empty_first_sub')}
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              haptic.medium();
              router.replace('/(game)');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyBtnText}>
              {hasAnyHistory ? t('history.empty_play_today') : t('history.empty_play_now')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        entries.map((entry, idx) => {
          const isRecent = entry.date === todayStr || entry.date === yesterdayStr;
          const isTop10 = entry.user_rank > 0 && entry.user_rank <= 10;
          const isPersonalBest = allTimeBest != null && entry.user_rank === allTimeBest && entry.user_rank > 0;
          const percentile = entry.total_players > 0 ? Math.round((entry.user_rank / entry.total_players) * 100) : null;
          const isWinner = entry.winner_user_id === userId;

          const rankColor = isPersonalBest ? '#2D1B69' : isTop10 ? '#FF6B4A' : '#1A1A2E';
          const borderLeftColor = isPersonalBest ? '#2D1B69' : isTop10 ? '#FF6B4A' : 'rgba(139,134,151,0.3)';

          return (
            <View
              key={entry.date}
              style={[styles.wordCard, { borderColor: 'rgba(26,26,46,0.08)' }]}
              onLayout={(e) => {
                cardRefs.current.set(entry.date, e.nativeEvent.layout.y);
              }}
            >
              {/* Top row */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.datePill,
                      {
                        backgroundColor: isRecent ? '#FF6B4A' : 'rgba(139,134,151,0.12)',
                      },
                    ]}
                  >
                    <Text style={[styles.datePillText, { color: isRecent ? '#FFFFFF' : '#8B8697' }]}>
                      {formatDatePill(entry.date)}
                    </Text>
                  </View>
                  <Text style={[styles.cardWord, { color: '#1A1A2E' }]}>{entry.word}</Text>
                </View>
                <View style={styles.cardRightCol}>
                  <Text style={[styles.cardRank, { color: rankColor }]}>#{entry.user_rank}</Text>
                  {isPersonalBest ? (
                    <Text style={styles.personalBest}>{t('history.personal_best')}</Text>
                  ) : percentile != null ? (
                    <Text style={styles.percentile}>{t('history.top_percent', { n: percentile })}</Text>
                  ) : null}
                </View>
              </View>

              {/* Description block */}
              <View style={[styles.descBlock, { borderLeftColor }]}>
                <Text style={styles.descText}>
                  {'\u201C'}
                  {formatDescription(entry.user_description)}
                  {'\u201D'}
                </Text>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerLeft}>
                  {'\uD83D\uDC41'} {t('history.players_count', { n: entry.total_players })}
                </Text>
                <Text style={styles.footerRight}>
                  {isWinner ? (
                    <Text style={{ color: '#FF6B4A', fontWeight: '600' }}>
                      {'\u2B50'} {t('history.you_won')}
                    </Text>
                  ) : entry.winning_description ? (
                    <>
                      {'\u2B50'} <Text style={{ color: '#8B8697' }}>{t('history.winner_label')} </Text>
                      <Text style={{ color: '#1A1A2E', fontWeight: '500' }}>
                        {'\u201C'}
                        {formatDescription(entry.winning_description)}
                        {'\u201D'}
                      </Text>
                    </>
                  ) : null}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { marginBottom: 16 },
  backBtn: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'PlayfairDisplay_700Bold', fontWeight: '900' },

  // Month nav
  monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 20 },
  monthArrow: { fontSize: 28, fontWeight: '300', paddingHorizontal: 8 },
  monthLabel: { fontSize: 15, fontWeight: '600', minWidth: 140, textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#8B8697', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 24, fontFamily: 'DMMono_500Medium', fontWeight: '700' },

  // Calendar
  calendar: { marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', marginBottom: 4 },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#8B8697',
    fontWeight: '500',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calendarCell: {
    width: '13.28%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: { fontSize: 11 },

  // Section divider
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  sectionLabel: { fontSize: 12, letterSpacing: 1, color: '#8B8697', fontWeight: '500' },
  sectionLine: { flex: 1, height: 0.5 },

  // Word cards
  wordCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  datePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  datePillText: { fontSize: 11, fontFamily: 'DMMono_500Medium', fontWeight: '700' },
  cardWord: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardRightCol: { alignItems: 'flex-end' },
  cardRank: { fontSize: 16, fontFamily: 'DMMono_500Medium', fontWeight: '700' },
  percentile: { fontSize: 11, color: '#8B8697', marginTop: 2 },
  personalBest: { fontSize: 11, color: '#FF6B4A', fontWeight: '600', marginTop: 2 },

  // Description block
  descBlock: {
    marginTop: 8,
    backgroundColor: '#FFFDF7',
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  descText: { fontSize: 14, color: '#1A1A2E', fontStyle: 'italic', fontWeight: '500', fontFamily: 'DMSans_500Medium' },

  // Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  footerLeft: { fontSize: 12, color: '#8B8697' },
  footerRight: { fontSize: 12, color: '#8B8697', flex: 1, textAlign: 'right' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
