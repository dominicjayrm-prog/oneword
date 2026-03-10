export interface BadgeTier {
  streak: number;
  emoji: string;
  name: string;
  nameEs: string;
  tagline: string;
  taglineEs: string;
  color: string;
  glow: string;
  bgGrad: [string, string];
}

export const BADGE_TIERS: BadgeTier[] = [
  {
    streak: 3, emoji: '✨', name: 'Spark', nameEs: 'Chispa',
    tagline: 'The flame begins.', taglineEs: 'La llama comienza.',
    color: '#FF8A6B', glow: 'rgba(255,138,107,0.4)', bgGrad: ['#1A1A2E', '#2E1A1A'],
  },
  {
    streak: 7, emoji: '🔥', name: 'On Fire', nameEs: 'En Llamas',
    tagline: 'A whole week. Unstoppable.', taglineEs: 'Una semana entera. Imparable.',
    color: '#FF6B4A', glow: 'rgba(255,107,74,0.35)', bgGrad: ['#1A1A2E', '#2E1510'],
  },
  {
    streak: 14, emoji: '⚡', name: 'Unstoppable', nameEs: 'Imparable',
    tagline: 'Two weeks of pure creativity.', taglineEs: 'Dos semanas de pura creatividad.',
    color: '#4A9BFF', glow: 'rgba(74,155,255,0.3)', bgGrad: ['#1A1A2E', '#101A2E'],
  },
  {
    streak: 30, emoji: '👑', name: 'Crowned', nameEs: 'Coronado',
    tagline: 'A month. You earned the crown.', taglineEs: 'Un mes. Te ganaste la corona.',
    color: '#FFD700', glow: 'rgba(255,215,0,0.3)', bgGrad: ['#1A1A2E', '#2E2810'],
  },
  {
    streak: 50, emoji: '💎', name: 'Diamond', nameEs: 'Diamante',
    tagline: 'Fifty days. Ice cold dedication.', taglineEs: 'Cincuenta días. Dedicación absoluta.',
    color: '#88E5FF', glow: 'rgba(136,229,255,0.3)', bgGrad: ['#1A1A2E', '#102028'],
  },
  {
    streak: 100, emoji: '⭐', name: 'Legend', nameEs: 'Leyenda',
    tagline: 'One hundred days. Legendary.', taglineEs: 'Cien días. Legendario.',
    color: '#FFD700', glow: 'rgba(255,215,0,0.5)', bgGrad: ['#1A1A2E', '#2E2200'],
  },
  {
    streak: 365, emoji: '♾️', name: 'Eternal', nameEs: 'Eterno',
    tagline: 'A full year. You are OneWord.', taglineEs: 'Un año entero. Tú eres OneWord.',
    color: '#FF6B4A', glow: 'rgba(255,107,74,0.5)', bgGrad: ['#1A1A2E', '#2D1B69'],
  },
];

export function getCurrentBadge(streak: number): BadgeTier | null {
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (streak >= BADGE_TIERS[i].streak) return BADGE_TIERS[i];
  }
  return null;
}

export function getNextBadge(streak: number): BadgeTier | null {
  return BADGE_TIERS.find((b) => b.streak > streak) || null;
}

export function getProgressToNext(streak: number): number {
  const current = getCurrentBadge(streak);
  const next = getNextBadge(streak);
  if (!next) return 1; // maxed out
  const base = current ? current.streak : 0;
  return (streak - base) / (next.streak - base);
}
