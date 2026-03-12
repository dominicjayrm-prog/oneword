/**
 * Client-side validation for 5-word descriptions.
 * Checks for gibberish, spam, and repeated words.
 * Runs BEFORE submission for instant feedback.
 */

// Common English words without standard vowels (a, e, i, o, u).
// "y" counts as a vowel for the check.
const VOWELLESS_WHITELIST = new Set([
  'rhythm', 'hymn', 'shy', 'fly', 'cry', 'dry', 'gym', 'myth', 'lynx',
  'my', 'by', 'try', 'fry', 'why', 'sky', 'spy', 'sly', 'thy', 'wry',
  'crypt', 'glyph', 'nymph', 'psych', 'sync', 'pygmy', 'tryst', 'cyst',
  'gyms', 'myths', 'hymns', 'dryly', 'shyly', 'slyly',
]);

// Allowed single-letter words per language
const SINGLE_LETTER_EN = new Set(['i', 'a']);
const SINGLE_LETTER_ES = new Set(['y', 'a', 'o', 'e', 'u']);

export type ValidationError = {
  code:
    | 'WORD_TOO_SHORT'
    | 'WORD_TOO_LONG'
    | 'GIBBERISH_DETECTED'
    | 'ALL_SAME_WORDS'
    | 'TOO_FEW_UNIQUE'
    | 'WORD_REPEATED_TOO_MUCH';
  message: string; // i18n key
  word?: string; // the offending word, if applicable
};

/**
 * Validate a 5-word description.
 * Returns null if valid, or a ValidationError if invalid.
 */
export function validateDescription(
  words: string[],
  language: string = 'en',
): ValidationError | null {
  const singleAllowed = language === 'es' ? SINGLE_LETTER_ES : SINGLE_LETTER_EN;
  const lowerWords = words.map((w) => w.toLowerCase().trim());

  // Per-word validation
  for (const word of lowerWords) {
    // Min 2 characters (unless allowed single-letter word)
    if (word.length < 2 && !singleAllowed.has(word)) {
      return { code: 'WORD_TOO_SHORT', message: 'validation.word_too_short', word };
    }

    // Max 15 characters
    if (word.length > 15) {
      return { code: 'WORD_TOO_LONG', message: 'validation.word_too_long', word };
    }

    // Must contain at least one vowel (a, e, i, o, u, y) or be whitelisted
    // Also allow Spanish accented vowels
    if (
      !/[aeiouyáéíóú]/i.test(word) &&
      !VOWELLESS_WHITELIST.has(word)
    ) {
      return { code: 'GIBBERISH_DETECTED', message: 'validation.gibberish', word };
    }

    // No more than 3 consecutive same characters
    if (/(.)\1{3,}/i.test(word)) {
      return { code: 'GIBBERISH_DETECTED', message: 'validation.gibberish', word };
    }
  }

  // Full-description validation
  const uniqueWords = new Set(lowerWords);

  // All 5 words cannot be identical
  if (uniqueWords.size === 1) {
    return { code: 'ALL_SAME_WORDS', message: 'validation.all_same' };
  }

  // At least 3 unique words
  if (uniqueWords.size < 3) {
    return { code: 'TOO_FEW_UNIQUE', message: 'validation.too_many_repeats' };
  }

  // No word can appear more than twice
  const wordCounts = new Map<string, number>();
  for (const word of lowerWords) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  for (const [word, count] of wordCounts) {
    if (count > 2) {
      return { code: 'WORD_REPEATED_TOO_MUCH', message: 'validation.too_many_repeats', word };
    }
  }

  return null;
}
