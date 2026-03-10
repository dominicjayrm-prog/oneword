// Profanity/slur list for App Store compliance.
// Blocks hard profanity, slurs, and explicit sexual content.
// Mild words (hell, damn, crap, etc.) are allowed — Apple does not flag these.
// Words are checked as whole words (not substrings) to avoid false positives.
const BLOCKED_WORDS_EN = new Set([
  // Hard profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks', 'fuk', 'fuking',
  'shit', 'shitting', 'shitty', 'shits', 'bullshit',
  'asshole', 'assholes',
  'bitch', 'bitches', 'bitching', 'bitchy',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'cock', 'cocks', 'cocksucker',
  'cunt', 'cunts',
  'pussy', 'pussies',
  'bastard', 'bastards',
  'whore', 'whores',
  'slut', 'sluts', 'slutty',
  'tits', 'titties', 'boobs', 'boobies',
  'wank', 'wanker', 'wankers',
  'twat', 'twats',
  'bollocks',
  'arsehole',
  'prick', 'pricks',

  // Slurs (racial, ethnic, homophobic, etc.)
  'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots', 'fag', 'fags',
  'dyke', 'dykes',
  'retard', 'retards', 'retarded',
  'spic', 'spics',
  'chink', 'chinks',
  'kike', 'kikes',
  'wetback', 'wetbacks',
  'beaner', 'beaners',
  'tranny', 'trannies',
  'coon', 'coons',
  'gook', 'gooks',
  'raghead', 'ragheads',
  'towelhead', 'towelheads',

  // Sexually explicit
  'blowjob', 'handjob', 'rimjob',
  'cum', 'cumming', 'cumshot',
  'jizz', 'ejaculate',
  'masturbate', 'masturbating',
  'dildo',
  'porn', 'porno', 'pornography',
  'hentai',
  'horny',

  // Violence / harmful
  'rape', 'raping', 'rapist',
  'suicide', 'suicidal',
  'pedophile', 'pedo', 'paedophile',
  'molest', 'molester',
  'genocide',

  // Common evasions
  'fck', 'fcking', 'fking', 'wtf', 'stfu', 'gtfo',
  'sh1t', 'f*ck', 'b1tch', 'a$$',
]);

// Spanish profanity list.
// Mild/common words ALLOWED for creativity: mierda, culo, carajo, coño, pendejo, cabrón, nalgas, idiota.
// Only hard profanity, slurs, sexually explicit, and violence terms are blocked.
const BLOCKED_WORDS_ES = new Set([
  // Hard profanity (equivalents of banned English words)
  'puta', 'putas', 'putita', 'putero',
  'perra', 'perras',                         // bitch
  'zorra', 'zorras',                         // slut
  'joder', 'jodido', 'jodida', 'jodidos', 'jodidas',  // fuck
  'chingar', 'chingado', 'chingada', 'chingados', 'chingadas', 'chingón',
  'verga', 'vergas', 'vergudo',              // dick
  'polla', 'pollas',                         // cock
  'picha',                                   // dick (regional)
  'concha',                                  // cunt (LatAm)
  'teta', 'tetas',                           // tits

  // Slurs (homophobic)
  'maricón', 'maricon', 'maricones',
  'marica', 'maricas',
  'joto', 'jotos', 'jota', 'jotas',         // homophobic (MX)
  'tortillera', 'tortilleras',               // lesbian slur
  'travelo', 'travelos',                     // transphobic

  // Slurs (ableist)
  'mongólico', 'mongolico', 'mongólicos', 'mongolicos',
  'subnormal', 'subnormales',

  // Slurs (ethnic/racial)
  'sudaca', 'sudacas',

  // Sexually explicit
  'mamada', 'mamadas',                       // blowjob
  'cogida',                                  // fuck (noun)
  'follada', 'follar', 'follando',           // fuck (Spain)
  'pajear', 'pajearse', 'paja',              // masturbate
  'corrida', 'correrse',                     // cum (sexual context — "corrida" also means bullfight but rare in 5-word descriptions)
  'pornografía', 'pornografia', 'porno',
  'cachondo', 'cachonda',                    // horny

  // Violence / harmful
  'violación', 'violacion', 'violar', 'violador',  // rape
  'suicidio', 'suicida',
  'pedófilo', 'pedofilo', 'pederasta',
  'genocidio',
]);

// Strip accents for evasion detection (e.g. someone typing "maricon" without accent)
function stripAccents(s: string): string {
  return s.replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ñ/g, 'n');
}

// Pre-compute accent-stripped Spanish blocked set so that stripped input
// is compared against stripped blocked words (not the accented originals).
const BLOCKED_WORDS_ES_STRIPPED = new Set(
  [...BLOCKED_WORDS_ES].map(stripAccents)
);

/**
 * Check if a description contains profanity.
 * Checks against both English and Spanish blocked word lists.
 * Returns { clean: boolean, flaggedWord?: string }
 */
export function checkProfanity(text: string): { clean: boolean; flaggedWord?: string } {
  // Strip zero-width and invisible Unicode characters that could bypass the filter
  const lower = text.toLowerCase().replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u2060-\u2064\u2066-\u206F]/g, '');

  // Split keeping Spanish characters intact
  const words = lower.replace(/[^a-záéíóúñü0-9\s]/g, '').split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (BLOCKED_WORDS_EN.has(word) || BLOCKED_WORDS_ES.has(word)) {
      return { clean: false, flaggedWord: word };
    }
    // Check accent-stripped version against Spanish list (catches "maricon" for "maricón")
    const stripped = stripAccents(word);
    if (BLOCKED_WORDS_ES_STRIPPED.has(stripped)) {
      return { clean: false, flaggedWord: word };
    }
  }

  // Check for l33t speak substitutions
  const deLeeted = lower
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/[^a-záéíóúñü\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of deLeeted) {
    if (BLOCKED_WORDS_EN.has(word) || BLOCKED_WORDS_ES.has(word)) {
      return { clean: false, flaggedWord: word };
    }
    const stripped = stripAccents(word);
    if (BLOCKED_WORDS_ES_STRIPPED.has(stripped)) {
      return { clean: false, flaggedWord: word };
    }
  }

  return { clean: true };
}
