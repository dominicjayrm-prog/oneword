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
  { username: "wordnerd", avatar: "\u{1F9E0}", language: "en", index: 1 },
  { username: "fivewordpoet", avatar: "\u{270D}\u{FE0F}", language: "en", index: 2 },
  { username: "silentwriter", avatar: "\u{1F4DD}", language: "en", index: 3 },
  { username: "dailymuse", avatar: "\u{1F3A8}", language: "en", index: 4 },
  { username: "sharpquill", avatar: "\u{1FAB6}", language: "en", index: 5 },
  { username: "inkandsoul", avatar: "\u{1F58B}", language: "en", index: 6 },
  { username: "briefgenius", avatar: "\u{1F4A1}", language: "en", index: 7 },
  { username: "tinythinker", avatar: "\u{1F914}", language: "en", index: 8 },
  { username: "quickwit", avatar: "\u{26A1}", language: "en", index: 9 },
  { username: "verbalsnap", avatar: "\u{1F4F8}", language: "en", index: 10 },
  { username: "phrasecraft", avatar: "\u{1F528}", language: "en", index: 11 },
  { username: "mindspill", avatar: "\u{1F30A}", language: "en", index: 12 },
  { username: "bluntpoet", avatar: "\u{1F3AF}", language: "en", index: 13 },
  { username: "oddangle", avatar: "\u{1F52E}", language: "en", index: 14 },
  { username: "rawlines", avatar: "\u{270F}\u{FE0F}", language: "en", index: 15 },
  { username: "fivedaily", avatar: "\u{1F5D3}", language: "en", index: 16 },
];

const SPANISH_ACCOUNTS: SeedAccount[] = [
  { username: "cincoletras", avatar: "\u{270D}\u{FE0F}", language: "es", index: 1 },
  { username: "elverbero", avatar: "\u{1F5E3}", language: "es", index: 2 },
  { username: "palabraviva", avatar: "\u{1F331}", language: "es", index: 3 },
  { username: "tintaloca", avatar: "\u{1F58B}", language: "es", index: 4 },
  { username: "plumafilosa", avatar: "\u{1FAB6}", language: "es", index: 5 },
  { username: "brevemusa", avatar: "\u{1F3AD}", language: "es", index: 6 },
  { username: "mentesuelta", avatar: "\u{1F9E0}", language: "es", index: 7 },
  { username: "frasefina", avatar: "\u{1F48E}", language: "es", index: 8 },
  { username: "rapidopluma", avatar: "\u{26A1}", language: "es", index: 9 },
  { username: "versocorto", avatar: "\u{1F4DC}", language: "es", index: 10 },
  { username: "almabreve", avatar: "\u{1F319}", language: "es", index: 11 },
  { username: "chispaverbal", avatar: "\u{2728}", language: "es", index: 12 },
  { username: "puntoycoma", avatar: "\u{1F4CC}", language: "es", index: 13 },
  { username: "ideasuelta", avatar: "\u{1F4A1}", language: "es", index: 14 },
  { username: "rimaloca", avatar: "\u{1F3AA}", language: "es", index: 15 },
  { username: "cincodiario", avatar: "\u{1F5D3}", language: "es", index: 16 },
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
    const password = `SeedAcc0unt!${account.language}${account.index}`;

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
