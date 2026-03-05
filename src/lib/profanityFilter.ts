// Common profanity/slur list. Covers major English profanity.
// Words are checked as whole words (not substrings) to avoid false positives.
const BLOCKED_WORDS = new Set([
  // Major profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks', 'fuk', 'fuking',
  'shit', 'shitting', 'shitty', 'shits', 'bullshit',
  'ass', 'asses', 'asshole', 'assholes',
  'bitch', 'bitches', 'bitching', 'bitchy',
  'damn', 'damned', 'dammit', 'goddamn', 'goddamnit',
  'hell',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'cock', 'cocks', 'cocksucker',
  'cunt', 'cunts',
  'pussy', 'pussies',
  'bastard', 'bastards',
  'whore', 'whores',
  'slut', 'sluts', 'slutty',
  'piss', 'pissed', 'pissing',
  'crap', 'crappy',
  'tits', 'titties', 'boobs', 'boobies',
  'penis', 'vagina', 'dildo',
  'wank', 'wanker', 'wankers',
  'twat', 'twats',
  'bollocks',
  'arse', 'arsehole',
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
  'negro', 'negros',
  'coon', 'coons',
  'gook', 'gooks',
  'raghead', 'ragheads',
  'towelhead', 'towelheads',

  // Sexually explicit
  'blowjob', 'handjob', 'rimjob',
  'cum', 'cumming', 'cumshot',
  'jizz', 'ejaculate',
  'masturbate', 'masturbating',
  'orgasm', 'orgasms',
  'anal', 'anus',
  'erection', 'boner',
  'horny', 'sexy',
  'porn', 'porno', 'pornography',
  'hentai',
  'nude', 'nudes', 'naked',

  // Violence / harmful
  'kill', 'killing', 'murder', 'rape', 'raping', 'rapist',
  'suicide', 'suicidal',
  'terrorist', 'terrorism',
  'pedophile', 'pedo', 'paedophile',
  'molest', 'molester',
  'genocide',

  // Common evasions
  'fck', 'fcking', 'fking', 'wtf', 'stfu', 'gtfo', 'lmfao',
  'sh1t', 'f*ck', 'b1tch', 'a$$',
  'peeing', 'pee',
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
