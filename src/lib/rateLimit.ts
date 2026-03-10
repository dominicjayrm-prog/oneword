/**
 * Simple client-side rate limiter using a sliding window.
 * NOT a security measure on its own — always enforce limits server-side too.
 * This provides UX protection against accidental rapid taps and basic abuse.
 */

const buckets = new Map<string, number[]>();

/**
 * Check if an action is allowed under the rate limit.
 * @param key   Unique identifier for the action (e.g. 'signIn', 'vote')
 * @param limit Max number of attempts allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    buckets.set(key, valid);
    return false; // rate limited
  }

  valid.push(now);
  buckets.set(key, valid);
  return true; // allowed
}

/**
 * Reset a rate limit bucket (e.g. after successful login).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Pre-configured rate limit checks for common actions
export const rateLimits = {
  /** Login: 5 attempts per 60s */
  signIn: () => rateLimit('signIn', 5, 60_000),
  /** Sign up: 3 attempts per 120s */
  signUp: () => rateLimit('signUp', 3, 120_000),
  /** Vote: 30 per 30s (matches server-side rate trigger) */
  vote: () => rateLimit('vote', 30, 30_000),
  /** Friend request: 10 per 60s */
  friendRequest: () => rateLimit('friendRequest', 10, 60_000),
  /** Search: 15 per 10s */
  search: () => rateLimit('search', 15, 10_000),
  /** Submit description: 5 per 30s */
  submit: () => rateLimit('submit', 5, 30_000),
  /** Report: 5 per 60s */
  report: () => rateLimit('report', 5, 60_000),
  /** Password reset: 3 per 120s */
  resetPassword: () => rateLimit('resetPassword', 3, 120_000),
};
