const ROLLOVER_HOUR_UTC = 5; // 5am UTC

/**
 * Returns the current "game date" — matches the server's game_date() function.
 * Before 5am UTC = still yesterday's game day.
 * After 5am UTC = today's game day.
 */
export function getGameDate(): string {
  const now = new Date();
  // Subtract 5 hours from current UTC time
  const adjusted = new Date(now.getTime() - ROLLOVER_HOUR_UTC * 60 * 60 * 1000);
  return adjusted.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Returns milliseconds until the next word rollover (5am UTC).
 * Useful for countdown timers or auto-refresh.
 */
export function msUntilNextWord(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(ROLLOVER_HOUR_UTC, 0, 0, 0);
  if (now.getUTCHours() >= ROLLOVER_HOUR_UTC) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Checks if we just crossed the rollover boundary.
 * Call this periodically to detect when a new word is available.
 */
export function hasWordRolledOver(lastKnownGameDate: string): boolean {
  return getGameDate() !== lastKnownGameDate;
}

/**
 * Returns the day of the week (0=Sun, 1=Mon, ..., 6=Sat) for the current game date.
 * Use this instead of new Date().getDay() for game-logic day checks (e.g. "is it Monday?").
 */
export function getGameDay(): number {
  const gd = getGameDate();
  return new Date(gd + 'T12:00:00Z').getDay();
}

/**
 * Returns the Monday of the week containing the given game date string (YYYY-MM-DD).
 */
export function getGameMonday(gameDateStr?: string): string {
  const dateStr = gameDateStr ?? getGameDate();
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split('T')[0];
}
