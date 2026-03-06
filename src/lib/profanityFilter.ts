// Profanity/slur list for App Store compliance.
// Blocks hard profanity, slurs, and explicit sexual content.
// Mild words (hell, damn, crap, etc.) are allowed — Apple does not flag these.
// Words are checked as whole words (not substrings) to avoid false positives.
const BLOCKED_WORDS = new Set([
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

/**
 * Check if a description contains profanity.
 * Returns { clean: boolean, flaggedWord?: string }
 */
export function checkProfanity(text: string): { clean: boolean; flaggedWord?: string } {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) {
      return { clean: false, flaggedWord: word };
    }
  }

  // Check for l33t speak substitutions
  const deLeeted = text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of deLeeted) {
    if (BLOCKED_WORDS.has(word)) {
      return { clean: false, flaggedWord: word };
    }
  }

  return { clean: true };
}
