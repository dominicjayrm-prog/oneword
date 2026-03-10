/** Medal emoji for ranks 1-3, chart emoji for all others */
export function getRankEmoji(rank: number | null): string {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return '\u{1F4CA}';
}
