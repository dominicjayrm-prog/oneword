// Edge Function: import-seed-descriptions
// Bulk imports pre-written seed descriptions into the seed_descriptions table
// Validates each description is exactly 5 words
//
// POST body: { "descriptions": [ { "word": "RAIN", "language": "en", "description": "Sky crying on my commute", "seed_account_index": 1 }, ... ] }
// Invoke with: supabase functions invoke import-seed-descriptions --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Profanity check — blocks hard profanity, slurs, and explicit content.
// Mirrors the client-side profanityFilter.ts blocked word lists.
const BLOCKED_WORDS = new Set([
  // English hard profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
  'shit', 'shitting', 'shitty', 'shits', 'bullshit',
  'asshole', 'assholes', 'bitch', 'bitches',
  'cunt', 'cunts', 'cock', 'cocks', 'cocksucker',
  'dick', 'dicks', 'dickhead', 'pussy', 'pussies',
  'whore', 'whores', 'slut', 'sluts',
  'wank', 'wanker', 'wankers', 'twat', 'twats',
  // Slurs
  'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots', 'fag', 'fags',
  'retard', 'retards', 'retarded',
  'spic', 'chink', 'kike',
  'tranny', 'trannies',
  // Sexually explicit
  'blowjob', 'handjob', 'cum', 'cumming', 'cumshot',
  'porn', 'porno', 'hentai',
  // Violence
  'rape', 'raping', 'rapist', 'pedophile', 'pedo',
  // Spanish hard profanity
  'puta', 'putas', 'perra', 'perras', 'zorra', 'zorras',
  'joder', 'jodido', 'jodida', 'chingar', 'chingado', 'chingada',
  'verga', 'vergas', 'polla', 'pollas', 'concha',
  // Spanish slurs
  'maricón', 'maricon', 'maricones', 'marica',
  'joto', 'jotos',
  // Spanish sexually explicit
  'mamada', 'mamadas', 'follar', 'follando',
  // Common evasions
  'fck', 'fcking', 'fking', 'stfu', 'gtfo',
]);

function containsProfanity(text: string): string | null {
  const lower = text.toLowerCase();
  const words = lower.replace(/[^a-záéíóúñü0-9\s]/g, '').split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) return word;
  }
  // Check accent-stripped version
  const stripped = lower
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
  const strippedWords = stripped.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  for (const word of strippedWords) {
    if (BLOCKED_WORDS.has(word)) return word;
  }
  return null;
}

interface SeedDescInput {
  word: string;
  language: string;
  description: string;
  seed_account_index: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  let body: { descriptions: SeedDescInput[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!body.descriptions || !Array.isArray(body.descriptions)) {
    return new Response(
      JSON.stringify({ error: "Body must have a 'descriptions' array" }),
      { status: 400 }
    );
  }

  const items = body.descriptions;
  let imported = 0;
  let skipped = 0;
  const errors: { index: number; reason: string; item: SeedDescInput }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Validate required fields
    if (!item.word || !item.language || !item.description || item.seed_account_index == null) {
      errors.push({ index: i, reason: "Missing required field", item });
      skipped++;
      continue;
    }

    // Validate language
    if (item.language !== "en" && item.language !== "es") {
      errors.push({ index: i, reason: `Invalid language: ${item.language}`, item });
      skipped++;
      continue;
    }

    // Validate seed_account_index
    if (item.seed_account_index < 1 || item.seed_account_index > 16) {
      errors.push({ index: i, reason: `Invalid seed_account_index: ${item.seed_account_index}`, item });
      skipped++;
      continue;
    }

    // Validate exactly 5 words
    const wordCount = countWords(item.description);
    if (wordCount !== 5) {
      errors.push({ index: i, reason: `Has ${wordCount} words, need exactly 5`, item });
      skipped++;
      continue;
    }

    // Profanity check
    const flaggedWord = containsProfanity(item.description);
    if (flaggedWord) {
      errors.push({ index: i, reason: `Contains blocked word: "${flaggedWord}"`, item });
      skipped++;
      continue;
    }

    // Insert
    const { error } = await supabaseAdmin.from("seed_descriptions").insert({
      word: item.word.toUpperCase().trim(),
      language: item.language.toLowerCase().trim(),
      description: item.description.trim(),
      seed_account_index: item.seed_account_index,
    });

    if (error) {
      errors.push({ index: i, reason: error.message, item });
      skipped++;
    } else {
      imported++;
    }
  }

  return new Response(
    JSON.stringify(
      {
        summary: { total: items.length, imported, skipped },
        errors: errors.length > 0 ? errors : undefined,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
});
