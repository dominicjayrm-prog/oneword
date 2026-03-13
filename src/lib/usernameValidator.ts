// Username profanity filter and validation.
// Rejects offensive usernames, reserved names, and enforces format rules.
// Uses a generic "not available" error to avoid revealing what's being filtered.

// --- Blocked words: cannot appear anywhere in a username (after normalization) ---
const BLOCKED_WORDS: string[] = [
  // English slurs and profanity
  'fuck',
  'shit',
  'ass',
  'bitch',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'fag',
  'faggot',
  'nigger',
  'nigga',
  'retard',
  'whore',
  'slut',
  'penis',
  'vagina',
  'anus',
  'nazi',
  'hitler',
  'rape',
  'rapist',
  'pedo',
  'pedophile',
  'molest',
  'porn',
  'hentai',
  'dildo',
  'wank',
  'twat',
  'bollock',
  'bastard',
  'arsehole',
  'asshole',
  'motherfuck',
  'dickhead',
  'shithead',
  'dumbass',
  'jackass',
  'homo',
  'tranny',
  'dyke',
  'spic',
  'chink',
  'kike',
  'gook',
  'wetback',
  'beaner',
  'cracker',
  'redneck',
  'coon',

  // Spanish slurs and profanity
  'puta',
  'puto',
  'mierda',
  'cono',
  'joder',
  'follar',
  'verga',
  'pendejo',
  'pendeja',
  'cabron',
  'culo',
  'marica',
  'maricon',
  'zorra',
  'perra',
  'chingar',
  'pinche',
  'huevon',
  'malparido',
  'gonorrea',
  'hijueputa',
  'mamon',
  'gilipollas',
  'capullo',
  'cojones',
  'pollas',
  'polla',
  'chocho',
  'bollera',
  'sudaca',
  'negrata',

  // Common circumventions
  'phuck',
  'phuk',
  'fuk',
  'fck',
  'sht',
  'btch',
  'dck',
  'azz',
  'a55',
  'b1tch',
  'sh1t',
  'f4g',
  'n1gger',
  'n1gga',
];

// --- Reserved/blocked exact usernames ---
const BLOCKED_USERNAMES: string[] = [
  'admin',
  'administrator',
  'oneword',
  'playoneword',
  'moderator',
  'mod',
  'support',
  'help',
  'official',
  'staff',
  'system',
  'root',
  'bot',
  'null',
  'undefined',
  'test',
  'delete',
  'god',
  'satan',
  'devil',
  'isis',
  'alqaeda',
  'taliban',
  'kkk',
  'sexsex',
  'xxx',
  'anal',
  'oral',
  'cum',
];

/**
 * Decode common l33t speak substitutions so "f4g" → "fag", "sh1t" → "shit", etc.
 */
function decodeLeetSpeak(str: string): string {
  return str
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

/**
 * Strip accents for evasion detection (matches profanityFilter.ts pattern).
 */
function stripAccents(s: string): string {
  return s
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ñ/g, 'n');
}

export type UsernameError =
  | 'username.tooShort'
  | 'username.tooLong'
  | 'username.invalidChars'
  | 'username.mustStartWithLetter'
  | 'username.consecutiveUnderscores'
  | 'username.notAvailable';

/**
 * Validate a username for format rules and profanity.
 * Returns null if valid, or an i18n key string if invalid.
 */
export function validateUsername(username: string, minLength: number, maxLength: number): UsernameError | null {
  // Format checks first
  if (username.length < minLength) return 'username.tooShort';
  if (username.length > maxLength) return 'username.tooLong';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'username.invalidChars';
  if (!/^[a-zA-Z]/.test(username)) return 'username.mustStartWithLetter';
  if (/__/.test(username)) return 'username.consecutiveUnderscores';

  // Profanity / reserved name checks
  if (!isUsernameClean(username)) return 'username.notAvailable';

  return null;
}

/**
 * Check the username against the blocklist.
 * Returns true if clean, false if blocked.
 */
export function isUsernameClean(username: string): boolean {
  // Normalize: lowercase, strip separators and numbers for matching
  const lower = username.toLowerCase();
  const stripped = lower.replace(/[_\-\.0-9]/g, '');
  const strippedNoAccents = stripAccents(stripped);

  // 1. Check exact match against reserved usernames
  if (BLOCKED_USERNAMES.includes(lower)) return false;
  if (BLOCKED_USERNAMES.includes(stripped)) return false;

  // 2. Check if the username CONTAINS any blocked word
  for (const word of BLOCKED_WORDS) {
    if (stripped.includes(word)) return false;
    if (strippedNoAccents.includes(word)) return false;
  }

  // 3. Check common l33t speak substitutions
  const decoded = decodeLeetSpeak(stripped);
  const decodedNoAccents = stripAccents(decoded);
  for (const word of BLOCKED_WORDS) {
    if (decoded.includes(word)) return false;
    if (decodedNoAccents.includes(word)) return false;
  }

  return true;
}
