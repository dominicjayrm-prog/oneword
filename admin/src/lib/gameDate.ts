const ROLLOVER_HOUR_UTC = 5;

/**
 * Returns the current "game date" — matches the server's game_date() function.
 * Before 5am UTC = still yesterday's game day.
 * After 5am UTC = today's game day.
 */
export function getGameDate(): string {
  const now = new Date();
  const adjusted = new Date(now.getTime() - ROLLOVER_HOUR_UTC * 60 * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}
