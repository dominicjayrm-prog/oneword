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
    if (!item.word || !item.language || !item.description || !item.seed_account_index) {
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
