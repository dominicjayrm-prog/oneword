'use server';

import { createAdminClient } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';

async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error('Not authenticated');
}

export async function getSeedStatus() {
  await requireAuth();
  const supabase = createAdminClient();

  // Get seed accounts count by language
  const { data: seedAccounts, error: accErr } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, language, current_streak, total_plays, is_seed_account')
    .eq('is_seed_account', true)
    .order('language')
    .order('created_at');

  // Get seed descriptions stats
  const { data: descStats, error: descErr } = await supabase
    .from('seed_descriptions')
    .select('word, language, used');

  // Get today's word for each language
  const { data: todayEn } = await supabase.rpc('get_today_word', { p_language: 'en' });
  const { data: todayEs } = await supabase.rpc('get_today_word', { p_language: 'es' });

  // Check if seeds already submitted today
  const todayWordEn = todayEn?.[0];
  const todayWordEs = todayEs?.[0];

  let todaySubmissionsEn = 0;
  let todaySubmissionsEs = 0;

  const enAccounts = (seedAccounts || []).filter((a: any) => a.language === 'en');
  const esAccounts = (seedAccounts || []).filter((a: any) => a.language === 'es');

  if (todayWordEn && enAccounts.length > 0) {
    const enIds = enAccounts.map((a: any) => a.id);
    const { count } = await supabase
      .from('descriptions')
      .select('id', { count: 'exact', head: true })
      .eq('word_id', todayWordEn.id)
      .in('user_id', enIds);
    todaySubmissionsEn = count || 0;
  }

  if (todayWordEs && esAccounts.length > 0) {
    const esIds = esAccounts.map((a: any) => a.id);
    const { count } = await supabase
      .from('descriptions')
      .select('id', { count: 'exact', head: true })
      .eq('word_id', todayWordEs.id)
      .in('user_id', esIds);
    todaySubmissionsEs = count || 0;
  }

  // Compute description stats
  const descriptions = descStats || [];
  const totalDescs = descriptions.length;
  const unusedDescs = descriptions.filter((d: any) => !d.used).length;
  const uniqueWords = [...new Set(descriptions.map((d: any) => `${d.word}_${d.language}`))].length;

  return {
    accounts: seedAccounts || [],
    enCount: enAccounts.length,
    esCount: esAccounts.length,
    totalDescriptions: totalDescs,
    unusedDescriptions: unusedDescs,
    uniqueWordsCovered: uniqueWords,
    todayWordEn: todayWordEn?.word || null,
    todayWordEs: todayWordEs?.word || null,
    todaySubmissionsEn,
    todaySubmissionsEs,
    todayWordEnId: todayWordEn?.id || null,
    todayWordEsId: todayWordEs?.id || null,
  };
}

export async function createSeedAccounts() {
  await requireAuth();
  const supabase = createAdminClient();

  const ENGLISH_ACCOUNTS = [
    { username: 'lucyy', avatar: '\u{1F338}', language: 'en', index: 1 },
    { username: 'mike_t', avatar: '\u{1F3C0}', language: 'en', index: 2 },
    { username: 'sarah.k', avatar: '\u{2615}', language: 'en', index: 3 },
    { username: 'jakerunner', avatar: '\u{1F3C3}', language: 'en', index: 4 },
    { username: 'emmareads', avatar: '\u{1F4DA}', language: 'en', index: 5 },
    { username: 'chris99', avatar: '\u{1F3AE}', language: 'en', index: 6 },
    { username: 'oliviaw', avatar: '\u{1F33B}', language: 'en', index: 7 },
    { username: 'benj_writes', avatar: '\u{270F}\u{FE0F}', language: 'en', index: 8 },
    { username: 'natfoodie', avatar: '\u{1F355}', language: 'en', index: 9 },
    { username: 'dylan.mp', avatar: '\u{1F3B5}', language: 'en', index: 10 },
    { username: 'rachelv', avatar: '\u{1F308}', language: 'en', index: 11 },
    { username: 'tomcat22', avatar: '\u{1F431}', language: 'en', index: 12 },
    { username: 'amyj_art', avatar: '\u{1F3A8}', language: 'en', index: 13 },
    { username: 'marcus.l', avatar: '\u{26BD}', language: 'en', index: 14 },
    { username: 'kaitlyn_r', avatar: '\u{1F319}', language: 'en', index: 15 },
    { username: 'willpower', avatar: '\u{1F4AA}', language: 'en', index: 16 },
  ];

  const SPANISH_ACCOUNTS = [
    { username: 'miguel.r', avatar: '\u{26BD}', language: 'es', index: 1 },
    { username: 'sofiaa_m', avatar: '\u{1F33A}', language: 'es', index: 2 },
    { username: 'carlos.gol', avatar: '\u{1F3C6}', language: 'es', index: 3 },
    { username: 'valentinaa', avatar: '\u{1F49C}', language: 'es', index: 4 },
    { username: 'andres_k', avatar: '\u{1F3B8}', language: 'es', index: 5 },
    { username: 'camila.writes', avatar: '\u{1F4D6}', language: 'es', index: 6 },
    { username: 'diego_sr', avatar: '\u{1F525}', language: 'es', index: 7 },
    { username: 'lucianafit', avatar: '\u{1F3CB}', language: 'es', index: 8 },
    { username: 'mateo.dev', avatar: '\u{1F4BB}', language: 'es', index: 9 },
    { username: 'isabela.c', avatar: '\u{2728}', language: 'es', index: 10 },
    { username: 'juanp_33', avatar: '\u{1F3C0}', language: 'es', index: 11 },
    { username: 'daniela.art', avatar: '\u{1F3A8}', language: 'es', index: 12 },
    { username: 'pablitoo', avatar: '\u{1F30E}', language: 'es', index: 13 },
    { username: 'mariana.v', avatar: '\u{1F338}', language: 'es', index: 14 },
    { username: 'santii.07', avatar: '\u{1F3AE}', language: 'es', index: 15 },
    { username: 'ale_moreno', avatar: '\u{2615}', language: 'es', index: 16 },
  ];

  const allAccounts = [...ENGLISH_ACCOUNTS, ...SPANISH_ACCOUNTS];
  const results: { username: string; status: string; error?: string }[] = [];

  for (const account of allAccounts) {
    const email = `seed${account.language}${String(account.index).padStart(2, '0')}@oneword.internal`;
    const password = `SeedAcc0unt!${account.language}${account.index}`;

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, is_seed_account')
        .eq('username', account.username)
        .single();

      if (existing) {
        if (!existing.is_seed_account) {
          await supabase.from('profiles').update({ is_seed_account: true }).eq('id', existing.id);
        }
        results.push({ username: account.username, status: 'already_exists' });
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: account.username, language: account.language },
      });

      if (authError) {
        results.push({ username: account.username, status: 'error', error: authError.message });
        continue;
      }

      const streak = Math.floor(Math.random() * 41) + 5;
      const totalPlays = streak + Math.floor(Math.random() * 10);

      const { error: profileError } = await supabase.rpc('create_seed_profile', {
        p_user_id: authData.user.id,
        p_username: account.username,
        p_avatar_url: account.avatar,
        p_language: account.language,
        p_streak: streak,
        p_total_plays: totalPlays,
      });

      if (profileError) {
        results.push({ username: account.username, status: 'error', error: profileError.message });
        continue;
      }

      results.push({ username: account.username, status: 'created' });
    } catch (err) {
      results.push({ username: account.username, status: 'error', error: String(err) });
    }
  }

  return {
    created: results.filter((r) => r.status === 'created').length,
    existing: results.filter((r) => r.status === 'already_exists').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  };
}

export async function runDailySeeds(language: 'en' | 'es' | 'both') {
  await requireAuth();
  const supabase = createAdminClient();

  const languages = language === 'both' ? ['en', 'es'] : [language];
  const report: Record<string, any> = {};

  for (const lang of languages) {
    const langReport: Record<string, any> = {};

    // 1. Get today's word
    const { data: wordRows, error: wordError } = await supabase.rpc('get_today_word', {
      p_language: lang,
    });

    if (wordError || !wordRows || wordRows.length === 0) {
      langReport.error = `No word for ${lang}: ${wordError?.message || 'empty'}`;
      report[lang] = langReport;
      continue;
    }

    const word = wordRows[0];
    langReport.word = word.word;

    // 2. Get seed accounts
    const { data: seedAccounts, error: seedError } = await supabase.rpc('get_seed_accounts', {
      p_language: lang,
    });

    if (seedError || !seedAccounts || seedAccounts.length === 0) {
      langReport.error = `No seed accounts for ${lang}`;
      report[lang] = langReport;
      continue;
    }

    langReport.accounts = seedAccounts.length;

    // 3. Submit descriptions
    let submitted = 0;
    let alreadyDone = 0;
    let noDesc = 0;
    let errors = 0;

    for (const account of seedAccounts) {
      // Check existing
      const { data: existing } = await supabase
        .from('descriptions')
        .select('id')
        .eq('user_id', account.user_id)
        .eq('word_id', word.id)
        .single();

      if (existing) {
        alreadyDone++;
        continue;
      }

      // Get seed description
      const { data: seedDescs } = await supabase.rpc('get_unused_seed_description', {
        p_word: word.word,
        p_language: lang,
        p_seed_index: account.seed_index,
      });

      if (!seedDescs || seedDescs.length === 0) {
        noDesc++;
        continue;
      }

      const seedDesc = seedDescs[0];

      // Submit
      const { error: submitError } = await supabase.rpc('submit_seed_description', {
        p_seed_user_id: account.user_id,
        p_word_id: word.id,
        p_description: seedDesc.description,
      });

      if (submitError) {
        errors++;
        continue;
      }

      // Mark used
      await supabase.rpc('mark_seed_used', { p_seed_desc_id: seedDesc.id });
      submitted++;
    }

    // 4. Run voting
    const votingReport = await runSeedVoting(supabase, word.id, seedAccounts);

    langReport.submitted = submitted;
    langReport.already_done = alreadyDone;
    langReport.no_description = noDesc;
    langReport.errors = errors;
    langReport.voting = votingReport;

    report[lang] = langReport;
  }

  return report;
}

async function runSeedVoting(supabase: any, wordId: string, seedAccounts: any[]) {
  const { data: descriptions } = await supabase
    .from('descriptions')
    .select('id, user_id, description, elo_rating')
    .eq('word_id', wordId);

  if (!descriptions || descriptions.length < 2) {
    return { error: 'Not enough descriptions', count: descriptions?.length || 0 };
  }

  let totalVotes = 0;
  let failedVotes = 0;

  for (const voter of seedAccounts) {
    const votable = descriptions.filter((d: any) => d.user_id !== voter.user_id);
    if (votable.length < 2) continue;

    const { count: existingVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_id', voter.user_id)
      .eq('word_id', wordId);

    const votesToCast = Math.max(0, 10 - (existingVotes || 0));

    for (let i = 0; i < votesToCast; i++) {
      const shuffled = [...votable].sort(() => Math.random() - 0.5);
      const desc1 = shuffled[0];
      const desc2 = shuffled[1];
      if (!desc1 || !desc2) break;

      let winner, loser;
      if ((desc1.elo_rating || 1000) >= (desc2.elo_rating || 1000)) {
        winner = Math.random() < 0.6 ? desc1 : desc2;
      } else {
        winner = Math.random() < 0.6 ? desc2 : desc1;
      }
      loser = winner === desc1 ? desc2 : desc1;

      const { error } = await supabase.rpc('submit_vote', {
        p_voter_id: voter.user_id,
        p_word_id: wordId,
        p_winner_id: winner.id,
        p_loser_id: loser.id,
      });

      if (error) failedVotes++;
      else totalVotes++;
    }
  }

  return { total_votes: totalVotes, failed: failedVotes };
}
