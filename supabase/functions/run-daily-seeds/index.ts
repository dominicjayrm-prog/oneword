// Edge Function: run-daily-seeds
// Submits seed descriptions for today's word and runs seed voting
// Should be called once daily (via cron or manually from admin panel)
//
// POST body (optional): { "skip_voting": false, "dry_run": false }
// Invoke with: supabase functions invoke run-daily-seeds --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedAccount {
  user_id: string;
  username: string;
  seed_index: number;
}

interface WordInfo {
  id: string;
  word: string;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  let options = { skip_voting: false, dry_run: false };
  try {
    const body = await req.json();
    if (body.skip_voting) options.skip_voting = true;
    if (body.dry_run) options.dry_run = true;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const languages = ["en", "es"];
  const report: Record<string, unknown> = {};

  for (const lang of languages) {
    const langReport: Record<string, unknown> = {};

    // 1. Get today's word for this language
    const { data: wordRows, error: wordError } = await supabaseAdmin.rpc("get_today_word", {
      p_language: lang,
    });

    if (wordError || !wordRows || wordRows.length === 0) {
      langReport.error = `No word found for ${lang}: ${wordError?.message || "empty result"}`;
      report[lang] = langReport;
      continue;
    }

    const word: WordInfo = wordRows[0];
    langReport.word = word.word;
    langReport.word_id = word.id;

    // 2. Get seed accounts for this language
    const { data: seedAccounts, error: seedError } = await supabaseAdmin.rpc("get_seed_accounts", {
      p_language: lang,
    });

    if (seedError || !seedAccounts || seedAccounts.length === 0) {
      langReport.error = `No seed accounts for ${lang}: ${seedError?.message || "none found"}`;
      report[lang] = langReport;
      continue;
    }

    langReport.seed_accounts_found = seedAccounts.length;

    // 3. Submit descriptions for each seed account
    const submissions: { username: string; status: string; description?: string; delay_minutes?: number }[] = [];

    for (const account of seedAccounts as SeedAccount[]) {
      // Check if this account already submitted today
      const { data: existing } = await supabaseAdmin
        .from("descriptions")
        .select("id")
        .eq("user_id", account.user_id)
        .eq("word_id", word.id)
        .single();

      if (existing) {
        submissions.push({ username: account.username, status: "already_submitted" });
        continue;
      }

      // Get unused seed description for this word + account index
      const { data: seedDescs, error: descError } = await supabaseAdmin.rpc("get_unused_seed_description", {
        p_word: word.word,
        p_language: lang,
        p_seed_index: account.seed_index,
      });

      if (descError || !seedDescs || seedDescs.length === 0) {
        submissions.push({ username: account.username, status: "no_description_available" });
        continue;
      }

      const seedDesc = seedDescs[0];

      if (options.dry_run) {
        submissions.push({
          username: account.username,
          status: "dry_run",
          description: seedDesc.description,
        });
        continue;
      }

      // Submit the description
      const { error: submitError } = await supabaseAdmin.rpc("submit_seed_description", {
        p_seed_user_id: account.user_id,
        p_word_id: word.id,
        p_description: seedDesc.description,
      });

      if (submitError) {
        submissions.push({ username: account.username, status: "submit_error", description: submitError.message });
        continue;
      }

      // Mark seed description as used
      const { error: markError } = await supabaseAdmin.rpc("mark_seed_used", { p_seed_desc_id: seedDesc.id });

      submissions.push({
        username: account.username,
        status: markError ? "submitted_mark_failed" : "submitted",
        description: seedDesc.description,
        ...(markError && { markError: markError.message }),
      });
    }

    langReport.submissions = submissions;
    langReport.submitted_count = submissions.filter((s) => s.status === "submitted").length;
    langReport.already_submitted = submissions.filter((s) => s.status === "already_submitted").length;
    langReport.no_description = submissions.filter((s) => s.status === "no_description_available").length;

    // 4. Run seed voting (if not skipped and not dry run)
    if (!options.skip_voting && !options.dry_run) {
      const votingReport = await runSeedVoting(word.id, lang, seedAccounts as SeedAccount[]);
      langReport.voting = votingReport;
    }

    report[lang] = langReport;
  }

  return new Response(
    JSON.stringify({ dry_run: options.dry_run, report }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
});

async function runSeedVoting(
  wordId: string,
  language: string,
  seedAccounts: SeedAccount[]
): Promise<Record<string, unknown>> {
  // Get all descriptions for this word
  const { data: descriptions, error } = await supabaseAdmin
    .from("descriptions")
    .select("id, user_id, description, elo_rating")
    .eq("word_id", wordId);

  if (error || !descriptions || descriptions.length < 2) {
    return { error: "Not enough descriptions to vote", count: descriptions?.length || 0 };
  }

  const seedUserIds = new Set(seedAccounts.map((a) => a.user_id));
  let totalVotes = 0;
  let failedVotes = 0;

  for (const voter of seedAccounts) {
    // Each seed account votes on up to 10 pairs
    const votableDescs = descriptions.filter((d) => d.user_id !== voter.user_id);

    if (votableDescs.length < 2) continue;

    // Check how many votes this seed already cast today
    const { count: existingVotes } = await supabaseAdmin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("voter_id", voter.user_id)
      .eq("word_id", wordId);

    const votesToCast = Math.max(0, 10 - (existingVotes || 0));

    for (let i = 0; i < votesToCast; i++) {
      // Pick two random descriptions using Fisher-Yates shuffle
      const shuffled = [...votableDescs];
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
      const desc1 = shuffled[0];
      const desc2 = shuffled[1];
      if (!desc1 || !desc2) break;

      // Slightly favour the one with higher elo (60/40 split) to make rankings natural
      let winner, loser;
      if ((desc1.elo_rating || 1000) >= (desc2.elo_rating || 1000)) {
        winner = Math.random() < 0.6 ? desc1 : desc2;
      } else {
        winner = Math.random() < 0.6 ? desc2 : desc1;
      }
      loser = winner === desc1 ? desc2 : desc1;

      const { error: voteError } = await supabaseAdmin.rpc("submit_vote", {
        p_voter_id: voter.user_id,
        p_word_id: wordId,
        p_winner_id: winner.id,
        p_loser_id: loser.id,
      });

      if (voteError) {
        failedVotes++;
      } else {
        totalVotes++;
      }
    }
  }

  return { total_votes_cast: totalVotes, failed_votes: failedVotes };
}
