// Edge Function: create-seed-accounts
// Creates 32 seed accounts (16 English, 16 Spanish) via Supabase Admin API
// Invoke with: supabase functions invoke create-seed-accounts --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedAccount {
  username: string;
  avatar: string;
  language: string;
  index: number;
}

const ENGLISH_ACCOUNTS: SeedAccount[] = [
  { username: "lucyy", avatar: "\u{1F338}", language: "en", index: 1 },
  { username: "mike_t", avatar: "\u{1F3C0}", language: "en", index: 2 },
  { username: "sarah.k", avatar: "\u{2615}", language: "en", index: 3 },
  { username: "jakerunner", avatar: "\u{1F3C3}", language: "en", index: 4 },
  { username: "emmareads", avatar: "\u{1F4DA}", language: "en", index: 5 },
  { username: "chris99", avatar: "\u{1F3AE}", language: "en", index: 6 },
  { username: "oliviaw", avatar: "\u{1F33B}", language: "en", index: 7 },
  { username: "benj_writes", avatar: "\u{270F}\u{FE0F}", language: "en", index: 8 },
  { username: "natfoodie", avatar: "\u{1F355}", language: "en", index: 9 },
  { username: "dylan.mp", avatar: "\u{1F3B5}", language: "en", index: 10 },
  { username: "rachelv", avatar: "\u{1F308}", language: "en", index: 11 },
  { username: "tomcat22", avatar: "\u{1F431}", language: "en", index: 12 },
  { username: "amyj_art", avatar: "\u{1F3A8}", language: "en", index: 13 },
  { username: "marcus.l", avatar: "\u{26BD}", language: "en", index: 14 },
  { username: "kaitlyn_r", avatar: "\u{1F319}", language: "en", index: 15 },
  { username: "willpower", avatar: "\u{1F4AA}", language: "en", index: 16 },
];

const SPANISH_ACCOUNTS: SeedAccount[] = [
  { username: "miguel.r", avatar: "\u{26BD}", language: "es", index: 1 },
  { username: "sofiaa_m", avatar: "\u{1F33A}", language: "es", index: 2 },
  { username: "carlos.gol", avatar: "\u{1F3C6}", language: "es", index: 3 },
  { username: "valentinaa", avatar: "\u{1F49C}", language: "es", index: 4 },
  { username: "andres_k", avatar: "\u{1F3B8}", language: "es", index: 5 },
  { username: "camila.writes", avatar: "\u{1F4D6}", language: "es", index: 6 },
  { username: "diego_sr", avatar: "\u{1F525}", language: "es", index: 7 },
  { username: "lucianafit", avatar: "\u{1F3CB}", language: "es", index: 8 },
  { username: "mateo.dev", avatar: "\u{1F4BB}", language: "es", index: 9 },
  { username: "isabela.c", avatar: "\u{2728}", language: "es", index: 10 },
  { username: "juanp_33", avatar: "\u{1F3C0}", language: "es", index: 11 },
  { username: "daniela.art", avatar: "\u{1F3A8}", language: "es", index: 12 },
  { username: "pablitoo", avatar: "\u{1F30E}", language: "es", index: 13 },
  { username: "mariana.v", avatar: "\u{1F338}", language: "es", index: 14 },
  { username: "santii.07", avatar: "\u{1F3AE}", language: "es", index: 15 },
  { username: "ale_moreno", avatar: "\u{2615}", language: "es", index: 16 },
];

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  const allAccounts = [...ENGLISH_ACCOUNTS, ...SPANISH_ACCOUNTS];
  const results: { username: string; status: string; userId?: string; error?: string }[] = [];

  for (const account of allAccounts) {
    const email = `seed${account.language}${String(account.index).padStart(2, "0")}@oneword.internal`;
    const password = crypto.randomUUID() + crypto.randomUUID();

    try {
      // Check if profile with this username already exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, username, is_seed_account")
        .eq("username", account.username)
        .single();

      if (existingProfile) {
        // Already exists — just ensure it's marked as seed
        if (!existingProfile.is_seed_account) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_seed_account: true })
            .eq("id", existingProfile.id);
        }
        results.push({ username: account.username, status: "already_exists", userId: existingProfile.id });
        continue;
      }

      // Create auth user via admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: account.username, language: account.language },
      });

      if (authError) {
        // If user already exists in auth but profile was missing/different
        if (authError.message?.includes("already been registered")) {
          results.push({ username: account.username, status: "auth_exists", error: authError.message });
          continue;
        }
        results.push({ username: account.username, status: "error", error: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // Random streak between 5 and 45
      const streak = Math.floor(Math.random() * 41) + 5;
      const totalPlays = streak + Math.floor(Math.random() * 10);

      // Create the seed profile via our helper function
      const { error: profileError } = await supabaseAdmin.rpc("create_seed_profile", {
        p_user_id: userId,
        p_username: account.username,
        p_avatar_url: account.avatar,
        p_language: account.language,
        p_streak: streak,
        p_total_plays: totalPlays,
      });

      if (profileError) {
        // Clean up orphaned auth user since profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
        results.push({ username: account.username, status: "profile_error", userId, error: profileError.message });
        continue;
      }

      results.push({ username: account.username, status: "created", userId });
    } catch (err) {
      results.push({ username: account.username, status: "exception", error: String(err) });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const existing = results.filter((r) => r.status === "already_exists" || r.status === "auth_exists").length;
  const errors = results.filter((r) => r.status === "error" || r.status === "exception" || r.status === "profile_error").length;

  return new Response(
    JSON.stringify({ summary: { created, existing, errors, total: allAccounts.length }, results }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
});
