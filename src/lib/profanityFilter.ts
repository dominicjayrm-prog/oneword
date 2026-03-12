// Profanity/slur list for App Store compliance.
// Blocks hard profanity, slurs, and explicit sexual content.
// Mild words (hell, damn, crap, etc.) are allowed — Apple does not flag these.
// Words are checked as whole words (not substrings) to avoid false positives.
const BLOCKED_WORDS_EN = new Set([
  // Hard profanity
  'fuck',
  'fucking',
  'fucked',
  'fucker',
  'fuckers',
  'fucks',
  'fuk',
  'fuking',
  'shit',
  'shitting',
  'shitty',
  'shits',
  'bullshit',
  'asshole',
  'assholes',
  'bitch',
  'bitches',
  'bitching',
  'bitchy',
  'dick',
  'dicks',
  'dickhead',
  'dickheads',
  'cock',
  'cocks',
  'cocksucker',
  'cunt',
  'cunts',
  'pussy',
  'pussies',
  'bastard',
  'bastards',
  'whore',
  'whores',
  'slut',
  'sluts',
  'slutty',
  'tits',
  'titties',
  'boobs',
  'boobies',
  'wank',
  'wanker',
  'wankers',
  'twat',
  'twats',
  'bollocks',
  'arsehole',
  'prick',
  'pricks',

  // Slurs (racial, ethnic, homophobic, etc.)
  'nigger',
  'niggers',
  'nigga',
  'niggas',
  'faggot',
  'faggots',
  'fag',
  'fags',
  'dyke',
  'dykes',
  'retard',
  'retards',
  'retarded',
  'spic',
  'spics',
  'chink',
  'chinks',
  'kike',
  'kikes',
  'wetback',
  'wetbacks',
  'beaner',
  'beaners',
  'tranny',
  'trannies',
  'coon',
  'coons',
  'gook',
  'gooks',
  'raghead',
  'ragheads',
  'towelhead',
  'towelheads',

  // Sexually explicit
  'blowjob',
  'handjob',
  'rimjob',
  'cum',
  'cumming',
  'cumshot',
  'jizz',
  'ejaculate',
  'masturbate',
  'masturbating',
  'dildo',
  'porn',
  'porno',
  'pornography',
  'hentai',
  'horny',

  // Violence / harmful
  'rape',
  'raping',
  'rapist',
  'suicide',
  'suicidal',
  'pedophile',
  'pedo',
  'paedophile',
  'molest',
  'molester',
  'genocide',

  // Common evasions
  'fck',
  'fcking',
  'fking',
  'wtf',
  'stfu',
  'gtfo',
  'sh1t',
  'f*ck',
  'b1tch',
  'a$$',
]);

// Spanish profanity list.
// Mild/common words ALLOWED for creativity: mierda, culo, carajo, coño, pendejo, cabrón, nalgas, idiota.
// Only hard profanity, slurs, sexually explicit, and violence terms are blocked.
const BLOCKED_WORDS_ES = new Set([
  // Hard profanity (equivalents of banned English words)
  'puta',
  'putas',
  'putita',
  'putero',
  'perra',
  'perras', // bitch
  'zorra',
  'zorras', // slut
  'joder',
  'jodido',
  'jodida',
  'jodidos',
  'jodidas', // fuck
  'chingar',
  'chingado',
  'chingada',
  'chingados',
  'chingadas',
  'chingón',
  'verga',
  'vergas',
  'vergudo', // dick
  'polla',
  'pollas', // cock
  'picha', // dick (regional)
  'concha', // cunt (LatAm)
  'teta',
  'tetas', // tits

  // Slurs (homophobic)
  'maricón',
  'maricon',
  'maricones',
  'marica',
  'maricas',
  'joto',
  'jotos',
  'jota',
  'jotas', // homophobic (MX)
  'tortillera',
  'tortilleras', // lesbian slur
  'travelo',
  'travelos', // transphobic

  // Slurs (ableist)
  'mongólico',
  'mongolico',
  'mongólicos',
  'mongolicos',
  'subnormal',
  'subnormales',

  // Slurs (ethnic/racial)
  'sudaca',
  'sudacas',

  // Sexually explicit
  'mamada',
  'mamadas', // blowjob
  'cogida', // fuck (noun)
  'follada',
  'follar',
  'follando', // fuck (Spain)
  'pajear',
  'pajearse',
  'paja', // masturbate
  'corrida',
  'correrse', // cum (sexual context — "corrida" also means bullfight but rare in 5-word descriptions)
  'pornografía',
  'pornografia',
  'porno',
  'cachondo',
  'cachonda', // horny

  // Violence / harmful
  'violación',
  'violacion',
  'violar',
  'violador', // rape
  'suicidio',
  'suicida',
  'pedófilo',
  'pedofilo',
  'pederasta',
  'genocidio',
]);

// Strip accents for evasion detection (e.g. someone typing "maricon" without accent)
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

/**
 * Normalize Unicode confusables and fullwidth characters to ASCII equivalents.
 * Catches evasion attempts like ＦＵＣＫusing fullwidth Latin (U+FF01-U+FF5E),
 * Cyrillic lookalikes, mathematical alphanumerics, etc.
 */
function normalizeUnicode(s: string): string {
  let result = s;

  // Fullwidth ASCII variants (U+FF01-U+FF5E → U+0021-U+007E)
  result = result.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  // Common Cyrillic lookalikes → Latin
  const cyrillicMap: Record<string, string> = {
    '\u0430': 'a',
    '\u0435': 'e',
    '\u043E': 'o',
    '\u0440': 'p',
    '\u0441': 'c',
    '\u0443': 'y',
    '\u0445': 'x',
    '\u0456': 'i',
    '\u0410': 'a',
    '\u0415': 'e',
    '\u041E': 'o',
    '\u0420': 'p',
    '\u0421': 'c',
    '\u0423': 'y',
    '\u0425': 'x',
  };
  result = result.replace(/[\u0400-\u04FF]/g, (ch) => cyrillicMap[ch] || ch);

  // Mathematical bold/italic/script Latin letters → ASCII
  // Bold A-Z: U+1D400-U+1D419, a-z: U+1D41A-U+1D433
  // Italic A-Z: U+1D434-U+1D44D, a-z: U+1D44E-U+1D467
  result = result.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    // Bold uppercase A-Z
    if (cp >= 0x1d400 && cp <= 0x1d419) return String.fromCharCode(cp - 0x1d400 + 65);
    // Bold lowercase a-z
    if (cp >= 0x1d41a && cp <= 0x1d433) return String.fromCharCode(cp - 0x1d41a + 97);
    // Italic uppercase A-Z
    if (cp >= 0x1d434 && cp <= 0x1d44d) return String.fromCharCode(cp - 0x1d434 + 65);
    // Italic lowercase a-z
    if (cp >= 0x1d44e && cp <= 0x1d467) return String.fromCharCode(cp - 0x1d44e + 97);
    return ch;
  });

  return result;
}

// Pre-compute accent-stripped Spanish blocked set so that stripped input
// is compared against stripped blocked words (not the accented originals).
const BLOCKED_WORDS_ES_STRIPPED = new Set([...BLOCKED_WORDS_ES].map(stripAccents));

// Slurs that should be caught even when embedded in longer words (partial matching).
// Only the most severe slurs — we don't want false positives on common words.
const PARTIAL_MATCH_SLURS = [
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'chink',
  'spic',
  'wetback',
  'beaner',
  'tranny',
  'gook',
  'raghead',
  'towelhead',
  // Spanish slurs
  'maricon',
  'maricón',
];

function checkWordAgainstLists(word: string): string | undefined {
  if (BLOCKED_WORDS_EN.has(word) || BLOCKED_WORDS_ES.has(word)) return word;
  const stripped = stripAccents(word);
  if (BLOCKED_WORDS_ES_STRIPPED.has(stripped)) return word;
  return undefined;
}

function deLeeted(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/6/g, 'g')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/\|/g, 'l')
    .replace(/\+/g, 't')
    .replace(/\(/g, 'c')
    .replace(/\{/g, 'c');
}

/**
 * Check if a description contains profanity.
 * Checks against both English and Spanish blocked word lists.
 * Also checks concatenated text to catch split words like "f u c k"
 * and partial matching for slurs embedded in longer words.
 * Returns { clean: boolean, flaggedWord?: string }
 */
export function checkProfanity(text: string): { clean: boolean; flaggedWord?: string } {
  // Strip zero-width and invisible Unicode characters that could bypass the filter
  let cleaned = text.toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u2060-\u2064\u2066-\u206F]/g, '');

  // Normalize Unicode confusables (fullwidth, Cyrillic lookalikes, math symbols)
  cleaned = normalizeUnicode(cleaned);

  const lower = cleaned;

  // Split keeping Spanish characters intact
  const words = lower
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  // 1. Check each word individually
  for (const word of words) {
    const flagged = checkWordAgainstLists(word);
    if (flagged) return { clean: false, flaggedWord: flagged };
  }

  // 2. Check l33t speak substitutions per word
  const deLeetedWords = deLeeted(lower)
    .replace(/[^a-záéíóúñü\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of deLeetedWords) {
    const flagged = checkWordAgainstLists(word);
    if (flagged) return { clean: false, flaggedWord: flagged };
  }

  // 3. Check concatenated text (catches "f u c k", "s h i t" split across words)
  const concatenated = words.join('');
  const concatenatedDeleeted = deLeeted(concatenated).replace(/[^a-záéíóúñü]/g, '');

  for (const slur of PARTIAL_MATCH_SLURS) {
    const slurNorm = stripAccents(slur);
    if (concatenated.includes(slur) || concatenated.includes(slurNorm)) {
      return { clean: false, flaggedWord: slur };
    }
    if (concatenatedDeleeted.includes(slur) || concatenatedDeleeted.includes(slurNorm)) {
      return { clean: false, flaggedWord: slur };
    }
  }

  // Also check full concatenation against full block lists (catches "fu ck" → "fuck")
  const concatFlagged = checkWordAgainstLists(concatenated);
  if (concatFlagged) return { clean: false, flaggedWord: concatFlagged };
  const concatDeleetFlagged = checkWordAgainstLists(concatenatedDeleeted);
  if (concatDeleetFlagged) return { clean: false, flaggedWord: concatDeleetFlagged };

  // 4. Partial matching: check if slurs are embedded in longer words
  for (const word of words) {
    const wordStripped = stripAccents(word);
    for (const slur of PARTIAL_MATCH_SLURS) {
      const slurNorm = stripAccents(slur);
      if (word.length > slur.length && (word.includes(slur) || wordStripped.includes(slurNorm))) {
        return { clean: false, flaggedWord: slur };
      }
    }
  }

  return { clean: true };
}
