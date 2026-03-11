// Centralized app constants — no magic numbers in business logic.

/** Network & timeout */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Profile fetch polling after signup (trigger may be slow) */
export const PROFILE_POLL_MAX_RETRIES = 5;
export const PROFILE_POLL_BASE_MS = 200;

/** Toast auto-dismiss duration */
export const TOAST_DURATION_MS = 3_000;

/** Voting: total pairs per day before prompting to check back later */
export const VOTE_BATCH_SIZE = 15;

/** Leaderboard */
export const LEADERBOARD_LIMIT = 20;

/** Description validation */
export const DESCRIPTION_WORD_COUNT = 5;
export const DESCRIPTION_MAX_LENGTH = 200;

/** Username validation */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Password validation */
export const PASSWORD_MIN_LENGTH = 6;
