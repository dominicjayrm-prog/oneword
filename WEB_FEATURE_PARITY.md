# OneWord Web — Feature Parity Guide

Complete documentation of every iOS feature the web app needs to replicate.
All features share the same Supabase project and database.

---

## Table of Contents

1. [Interstitial Flow (Yesterday + Weekly)](#1-interstitial-flow)
2. [Yesterday's Winner / Daily Recap](#2-yesterdays-winner--daily-recap)
3. [Weekly Recap](#3-weekly-recap)
4. [Streak System & Badge Tiers](#4-streak-system--badge-tiers)
5. [Streak Celebration (Badge Unlock)](#5-streak-celebration-badge-unlock)
6. [Share Cards](#6-share-cards)
7. [Vote Screen (Batching + Persistence)](#7-vote-screen)
8. [Results Screen (Global + Friends Tabs)](#8-results-screen)
9. [Friends Screen](#9-friends-screen)
10. [Profile Screen](#10-profile-screen)
11. [Friends System (RPCs + Tables)](#11-friends-system)
12. [Description Reporting](#12-description-reporting)
13. [Account Deletion](#13-account-deletion)
14. [Onboarding Flow](#14-onboarding-flow)
15. [Game Date Rollover Logic](#15-game-date-rollover-logic)
16. [Network Offline Banner](#16-network-offline-banner)
17. [Rate Limiting (Client-Side)](#17-rate-limiting-client-side)
18. [Timezone Syncing](#18-timezone-syncing)
19. [Password Recovery Flow](#19-password-recovery-flow)
20. [Complete RPC Reference](#20-complete-rpc-reference)
21. [Quick Checklist](#21-quick-checklist)

---

## 1. Interstitial Flow

**This is the most important section** — it describes the exact order and conditions under which yesterday's winner and weekly recap are shown.

### iOS Code Location
- `app/(game)/index.tsx:94-159`

### Storage Keys
```typescript
const STORAGE_KEY_RECAP = 'recap_dismissed_week';   // value = getGameMonday() string
const STORAGE_KEY_WINNER = 'winner_dismissed_date';  // value = getGameDate() string
```

### Trigger Conditions
The interstitial effect fires **once per app mount** when all three are true:
1. `auth.session` exists (user is logged in)
2. `auth.profile` exists (profile loaded)
3. `gameLoading === false` (today's word fetched)

Uses a `interstitialStartedRef` guard (reset on logout) to prevent duplicate fetches.

### Flow (Sequential)

```
1. Is it Monday? (getGameDay() === 1)
   ├── YES → Check if recap already dismissed this Monday
   │         (AsyncStorage.getItem('recap_dismissed_week') !== getGameMonday())
   │         ├── NOT dismissed → Call get_weekly_recap()
   │         │                   If data returned (days_played > 0):
   │         │                   → Show WeeklyRecapCard (full-screen takeover)
   │         └── Already dismissed → Skip
   └── NO → Skip

2. ALWAYS check yesterday's winner (regardless of day):
   Check if winner already dismissed today
   (AsyncStorage.getItem('winner_dismissed_date') !== getGameDate())
   ├── NOT dismissed → Call get_yesterday_winner()
   │                   If data returned (winner_description truthy):
   │                   → Queue YesterdayWinnerCard
   └── Already dismissed → Skip
```

### Display Priority
- **Weekly recap is shown FIRST** (if applicable)
- Yesterday's winner is **queued but not shown** until recap is dismissed
- Both are pre-fetched in parallel — the recap just blocks display of the winner

### Dismissal
```typescript
// When user dismisses weekly recap:
AsyncStorage.setItem('recap_dismissed_week', getGameMonday());

// When user dismisses yesterday winner:
AsyncStorage.setItem('winner_dismissed_date', getGameDate());
```

### Web Implementation
- Use `localStorage` instead of `AsyncStorage`
- Same key names and values work
- Fire the interstitial check on page load after auth + game data ready
- On Monday: show weekly recap modal first, then yesterday winner
- Other days: show yesterday winner only

---

## 2. Yesterday's Winner / Daily Recap

### RPC

```
get_yesterday_winner(p_user_id uuid, p_language text)
```

### Response Shape

```typescript
interface YesterdayWinner {
  word: string;               // Yesterday's word
  word_category: string;      // Category (e.g. "noun", "adjective")
  winner_description: string; // The winning 5-word description
  winner_username: string;    // Winner's @username
  winner_votes: number;       // Number of votes the winner received
  user_description: string | null;  // Current user's description (null if didn't play)
  user_rank: number | null;         // Current user's rank (null if didn't play)
  total_descriptions: number;       // Total participants yesterday
  user_was_winner: boolean;         // True if the current user won
}
```

### iOS Code Location
- **RPC call**: `src/contexts/GameContext.tsx:220-239` — `getYesterdayWinner()`
- **UI component**: `src/components/YesterdayWinnerCard.tsx`
- **Trigger**: `app/(game)/index.tsx:126-138`

### Business Logic
- Returns `null` if `data[0].winner_description` is falsy
- **Two UI variants:**
  1. **User won** (`user_was_winner === true`): Gold border, "YOU WON" header, haptic success
  2. **Normal**: Shows winner info + user's own rank/description, or "You didn't play yesterday"
- Dismissed via "See today's word" button
- Dismissed state persisted per game date (see Section 1)

---

## 3. Weekly Recap

### RPC

```
get_weekly_recap(p_user_id uuid, p_language text)
```

### Response Shape

```typescript
interface WeeklyRecap {
  days_played: number;                    // 0-7
  total_votes_received: number;
  best_rank: number | null;
  best_rank_word: string | null;
  best_rank_description: string | null;
  best_rank_total_players: number | null;
  average_rank: number | null;
  previous_week_average_rank: number | null; // For "improved" indicator
  current_streak: number;
  total_descriptions_submitted: number;
  perfect_week: boolean;                  // days_played === 7
  week_start: string;                     // 'YYYY-MM-DD' (Monday)
  week_end: string;                       // 'YYYY-MM-DD' (Sunday)
}
```

### iOS Code Location
- **RPC call**: `src/contexts/GameContext.tsx:241-257` — `getWeeklyRecap()`
- **UI**: `src/components/WeeklyRecap.tsx` — Full-screen animated recap
- **Share card**: `src/components/WeeklyRecapShareCard.tsx`
- **Trigger**: `app/(game)/index.tsx:112-123`

### Business Logic
- Returns `null` if `days_played === 0`
- **Only shown on Mondays** (game day === 1), dismissed per-Monday
- Dark themed regardless of user theme (`#1A1A2E` + `#2D1B69`)
- Sections: header, best-of-week card, 7 day circles, 2x2 stats grid, share button
- "Improved" indicator shown when `average_rank < previous_week_average_rank`
- Share generates 960x1200 PNG via `react-native-view-shot`

---

## 4. Streak System & Badge Tiers

### Streak Update RPC

```
update_streak(p_user_id uuid)
```

Called immediately after successful description insertion (`src/contexts/GameContext.tsx:149`). **The web must also call this after every submission.**

### Badge Tiers (`src/lib/badges.ts`)

| Streak | Emoji | Name (EN) | Name (ES) | Color | Glow | Background Gradient |
|--------|-------|-----------|-----------|-------|------|---------------------|
| 3 | ✨ | Spark | Chispa | `#FF8A6B` | `rgba(255,138,107,0.4)` | `['#1A1A2E','#2E1A1A']` |
| 7 | 🔥 | On Fire | En Llamas | `#FF6B4A` | `rgba(255,107,74,0.35)` | `['#1A1A2E','#2E1510']` |
| 14 | ⚡ | Unstoppable | Imparable | `#4A9BFF` | `rgba(74,155,255,0.3)` | `['#1A1A2E','#101A2E']` |
| 30 | 👑 | Crowned | Coronado | `#FFD700` | `rgba(255,215,0,0.3)` | `['#1A1A2E','#2E2810']` |
| 50 | 💎 | Diamond | Diamante | `#88E5FF` | `rgba(136,229,255,0.3)` | `['#1A1A2E','#102028']` |
| 100 | ⭐ | Legend | Leyenda | `#FFD700` | `rgba(255,215,0,0.5)` | `['#1A1A2E','#2E2200']` |
| 365 | ♾️ | Eternal | Eterno | `#FF6B4A` | `rgba(255,107,74,0.5)` | `['#1A1A2E','#2D1B69']` |

### Helper Functions

```typescript
getCurrentBadge(streak: number): BadgeTier | null  // Highest earned badge
getNextBadge(streak: number): BadgeTier | null      // Next unlock target
getProgressToNext(streak: number): number           // 0-1 fraction
```

### Where Badges Appear
- Leaderboard rows: `streak_badge_emoji` from `get_leaderboard`
- Vote cards: `desc1_badge_emoji` / `desc2_badge_emoji` from `get_vote_pair`
- Vote card author line: `@username ✨` format
- Friends list: `friend_badge_emoji`
- Profile: `BadgePill` + `BadgeProgress` components
- Weekly recap stats grid

### Profile Table Fields
`current_streak`, `longest_streak`, `streak_badge_emoji`, `streak_badge_name` — updated server-side by `update_streak`.

---

## 5. Streak Celebration (Badge Unlock)

### Trigger Logic (`app/(game)/index.tsx:183-215`)

```typescript
// After submitDescription() succeeds:
const newStreak = oldStreak + 1;
const oldBadge = getCurrentBadge(oldStreak);
const newBadge = getCurrentBadge(newStreak);

if (newBadge && (!oldBadge || newBadge.streak !== oldBadge.streak)) {
  // New badge unlocked! Check AsyncStorage to avoid re-showing:
  const key = `milestone_shown_${newBadge.streak}`;
  const shown = await AsyncStorage.getItem(key);
  if (!shown) {
    // Show celebration after 500ms delay
    setCelebrationBadge(newBadge);
    await AsyncStorage.setItem(key, 'true');
  }
}
```

### iOS Code Location
- `src/components/StreakCelebration.tsx`

### UI Elements
- Full-screen overlay with badge-themed gradient (`badge.bgGrad`)
- Confetti particles (35 normal, 50 for Eternal)
- Ring burst animations (3 normal, 5 for Eternal)
- Badge emoji (80px), streak number, name, tagline
- Stats row: days played, best rank, total votes
- Next milestone progress bar (or "highest tier" message)
- Tap anywhere to dismiss

### Web Notes
- Use `canvas-confetti` or CSS for particle effects
- Persist `milestone_shown_${streak}` in localStorage
- The `oldStreak` comes from the `submitDescription()` return value

---

## 6. Share Cards

### Daily Result Share Card
- **File**: `src/components/ShareCard.tsx`
- **Trigger**: Results screen → "Share Results" button → Preview modal → "Share" button
- **Trigger location**: `app/(game)/results.tsx:83-112`
- **Data**: `{ word, description, rank, votes, streak }`
- **Spec**: 320x400px rendered, 960x1200 captured
- **Design**: Dark purple gradient (`#1A1A2E` + `#2D1B69`), OneWord logo, word, description in quotes, rank/votes/streak stats, "playoneword.app" footer

### Weekly Recap Share Card
- **File**: `src/components/WeeklyRecapShareCard.tsx`
- **Trigger**: Weekly recap screen → "Share Your Week" button
- **Data**: `WeeklyRecap` object + formatted date range
- **Design**: Same dark purple gradient, logo, date range, best word/desc/rank, stats line

### Web Implementation
- Use `html2canvas` or `dom-to-image` for client-side capture
- Or generate OG images server-side with the same data

---

## 7. Vote Screen

### iOS Code Location
- `app/(game)/vote.tsx`

### Key Behaviors the Web Should Replicate

#### Vote Batching
- **Batch size**: `VOTE_BATCH_SIZE = 15` pairs per session
- After 15 pairs shown, display "Great work!" done screen (not an error)
- "Done" screen shows total votes cast and suggests checking results

#### Vote Count Persistence
```typescript
// Storage key: `vote_progress_${wordId}_${getGameDate()}`
// Persisted across page reloads within the same game day
const key = `vote_progress_${todayWord.id}_${getGameDate()}`;
```
- On mount: restore vote count from storage
- If restored count >= 15: immediately show "batch exhausted" screen
- On each vote: increment and persist

#### "No More Pairs" vs "Batch Done"
- `noMorePairs`: Server returned null from `get_vote_pair` — all available pairs seen
- `batchExhausted`: Client hit 15-pair limit — more pairs may exist

#### Locked State
- If user hasn't submitted today's description, show "Submit first to unlock voting"
- Same lock applies to results screen

#### Author Display on Vote Cards
- Shows `@username` + badge emoji below each description
- Report link below each card

---

## 8. Results Screen

### iOS Code Location
- `app/(game)/results.tsx`

### Key Features

#### Global / Friends Tab Toggle
- Segmented control at top: "🌍 Global" | "👥 Friends"
- Global tab: calls `get_leaderboard`, shows `LeaderboardRow` list
- Friends tab: renders `FriendsLeaderboard` component (calls `get_friends_descriptions`)

#### Share Preview Modal
- "Share Results" button opens modal with rendered `ShareCard`
- User sees preview, then taps "Share" to capture and share

#### Locked State
- Same as vote screen — user must submit first

#### Leaderboard Limit
- `LEADERBOARD_LIMIT = 20` entries

---

## 9. Friends Screen

### iOS Code Location
- `app/(game)/friends.tsx`

### Sections (top to bottom)
1. **Friend Requests** — `FriendRequests` component with accept/decline buttons
2. **Friends Today** — `FriendsToday` showing friends' descriptions for today's word
3. **All Friends** — `FriendsList` with remove option + "Add Friends" button

### Data Loading
```typescript
const [friendsData, requestsData] = await Promise.all([
  getFriends(userId),
  getPendingRequests(userId),
]);
// Then if friends exist:
const descs = await getFriendsDescriptions(userId, todayWord.id);
```

### Empty State
- If no friends and no pending requests: large "👥" emoji + "Add Friends" CTA

### Add Friend Modal
- Opens `AddFriendModal` — search with `search_users` RPC, paginated (10 per page)
- Shows current streak + badge emoji for each result
- Button states: "Add" (send request), "Pending" (already sent), "Friends" (already friends)

---

## 10. Profile Screen

### iOS Code Location
- `app/profile.tsx` (presented as modal with slide-from-bottom)

### Sections

#### Header
- Emoji avatar (tappable to change)
- Username
- Badge pill with name (if streak >= 3)
- "Member since [month year]"

#### Badge Progress Bar
- `BadgeProgress` component showing progress toward next tier
- Or "Eternal — highest tier" if maxed out

#### Avatar Picker
- 16 emoji options: 🎭🦊🐙🌟🎨🔥💎🌙🦄🍕🎯🧊🪐🎸🌊🦅
- Selection calls `updateAvatar(emoji)` → `profiles.update({ avatar_url })`

#### Stats Grid (2x2 + 1)
| Stat | Profile Field | Icon |
|------|--------------|------|
| Current Streak | `current_streak` | 🔥 |
| Best Streak | `longest_streak` | ⭐ |
| Total Plays | `total_plays` | 🎮 |
| Votes Received | `total_votes_received` | 👍 |
| Best Rank | `best_rank` | 🏆 |

#### Actions
- Back to home button
- Log out (with confirmation dialog)
- Delete account (with confirmation → type username to confirm)

#### Support Section
- Contact: support@playoneword.app
- Website: playoneword.app
- Privacy Policy link
- Terms of Use link

#### Language Switcher
- English / Español toggle at bottom
- Calls `updateLanguage(lang)` → updates profile + i18n

---

## 11. Friends System (RPCs + Tables)

### RPCs the Web Already Calls
- `get_friends(p_user_id)` — List accepted friends
- `get_friends_descriptions(p_user_id, p_word_id)` — Friends' descriptions

### RPCs the Web Needs to Add

#### `get_pending_requests(p_user_id uuid)`
```typescript
interface PendingRequest {
  friendship_id: string;
  requester_id: string;
  requester_username: string;
  requester_avatar_url: string | null;
  created_at: string;
}
```
**iOS**: `src/lib/friends.ts:80-110`

#### `search_users(p_query text, p_current_user uuid, p_limit int, p_offset int)`
```typescript
interface UserSearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  is_friend: boolean;
  request_pending: boolean;
}
```
**iOS**: `src/lib/friends.ts:153-193` — Page size: 10, offset-based pagination

### Direct Table Operations (No RPC)

```typescript
// Send friend request
supabase.from('friendships').insert({
  requester_id: currentUserId,
  addressee_id: targetUserId,
  status: 'pending',
});

// Accept friend request
supabase.from('friendships')
  .update({ status: 'accepted', updated_at: new Date().toISOString() })
  .eq('id', friendshipId);

// Decline or remove friend
supabase.from('friendships').delete().eq('id', friendshipId);
```

### Business Logic
- Friends' descriptions **locked** until user submits their own (shows 🔒 message)
- Self-requests blocked (`requesterId === addresseeId`)
- Rate limited: 10 friend requests per 60s, 15 searches per 10s

---

## 12. Description Reporting

### RPC
```
submit_report(p_reporter_id uuid, p_description_id uuid, p_word_id uuid)
```

### iOS Code Location
- **RPC**: `src/contexts/GameContext.tsx:203-218`
- **UI**: `app/(game)/vote.tsx:234-259` — Confirmation dialog before report, success alert after

### Flow
1. User taps "Report" link below vote card
2. Confirmation dialog: "Report this description?"
3. On confirm: calls `submit_report` RPC, then loads next pair
4. Success alert: "We'll review this description"
5. Rate limited: 5 reports per 60s

---

## 13. Account Deletion

### RPC
```
delete_own_account()
```
No parameters — uses authenticated session context.

### iOS Code Location
- `src/contexts/AuthContext.tsx:285-292`
- `app/profile.tsx:102-125`

### Flow
1. User taps "Delete Account" on profile
2. First confirmation dialog (Alert)
3. Second confirmation: must type exact username
4. Calls `delete_own_account()` RPC
5. On success: signs out automatically

---

## 14. Onboarding Flow

### iOS Code Location
- `app/(onboarding)/index.tsx` — Main flow
- `app/_layout.tsx:39-62` — Gate logic
- `src/components/onboarding/OnboardingScreen{1,2,3}.tsx`

### Gate Logic
```typescript
// On app start:
const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
if (!hasSeenOnboarding) router.replace('/(onboarding)');

// On finish:
await AsyncStorage.setItem('hasSeenOnboarding', 'true');
router.replace('/');
```

### 3 Screens
1. **Describe**: Shows example word "Rain", animated word pills appear one by one, 5/5 counter
2. **Vote**: Two description cards slide in, one gets "picked" with badge animation, progress bar fills
3. **Compete**: Mock leaderboard (gold/silver/bronze entries), stats row (streak/trophies/votes)

### Navigation
- Horizontal paging ScrollView with dot indicators
- Back/Next buttons
- Last screen: "Let's Play!" button (finishes onboarding)

### Web Implementation
- Use localStorage `hasSeenOnboarding` flag
- Stepper/carousel UI with CSS transitions
- All text localized under `onboarding.*` i18n keys

---

## 15. Game Date Rollover Logic

### Critical: Game day boundary is 5:00 AM UTC

From `src/lib/gameDate.ts`:

```typescript
const ROLLOVER_HOUR_UTC = 5;

function getGameDate(): string {
  const now = new Date();
  const adjusted = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

function msUntilNextWord(): number { /* ms until next 5am UTC */ }
function hasWordRolledOver(lastKnownGameDate: string): boolean { /* date changed? */ }
function getGameDay(): number { /* 0=Sun..6=Sat for game date */ }
function getGameMonday(gameDateStr?: string): string { /* Monday of game week */ }
```

### iOS Auto-Refresh (`src/contexts/GameContext.tsx:86-107`)
- Polls every 60s checking `hasWordRolledOver()`
- Also checks on app foreground (`AppState.change` event)
- On rollover: re-fetches today's word, resets `hasSubmitted` + `userDescription`

### Web Implementation
- `setInterval(checkRollover, 60_000)`
- `document.addEventListener('visibilitychange', checkRollover)`
- Show countdown timer with `msUntilNextWord()`

---

## 16. Network Offline Banner

- **File**: `src/components/NetworkBanner.tsx`
- Animated banner slides down when offline
- **Web**: Use `navigator.onLine` + `online`/`offline` events

---

## 17. Rate Limiting (Client-Side)

From `src/lib/rateLimit.ts` — sliding window:

| Action | Limit | Window |
|--------|-------|--------|
| Sign in | 5 | 60s |
| Sign up | 3 | 120s |
| Vote | 30 | 30s |
| Friend request | 10 | 60s |
| Search | 15 | 10s |
| Submit description | 5 | 30s |
| Report | 5 | 60s |
| Password reset | 3 | 120s |

UX-level protections only — server-side enforcement is separate.

---

## 18. Timezone Syncing

On every profile fetch, sync device timezone:

```typescript
const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (deviceTimezone !== storedTimezone) {
  await supabase.from('profiles')
    .update({ timezone: deviceTimezone })
    .eq('id', userId);
}
```

**iOS**: `src/contexts/AuthContext.tsx:98-110`

---

## 19. Password Recovery Flow

### iOS: `src/contexts/AuthContext.tsx:304-320`, `app/(game)/index.tsx:291-315`

1. User enters email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'oneword://reset-password' })`
2. Email link opens app → Supabase fires `PASSWORD_RECOVERY` event
3. App shows "Set new password" form (two fields: new + confirm)
4. Submit → `supabase.auth.updateUser({ password: newPassword })`
5. On success: clears `passwordRecovery` state, user is logged in

### Web Implementation
- Change `redirectTo` to your web URL
- Handle `PASSWORD_RECOVERY` from `supabase.auth.onAuthStateChange`
- Show inline password reset form

---

## 20. Complete RPC Reference

### RPCs the Web Already Uses
| RPC | Params | Used For |
|-----|--------|----------|
| `get_today_word` | `p_language` | Fetch today's word |
| `get_leaderboard` | `p_word_id, p_limit` | Today's leaderboard (limit=20) |
| `get_vote_pair` | `p_word_id, p_voter_id` | Get two descriptions to vote on |
| `submit_vote` | `p_voter_id, p_word_id, p_winner_id, p_loser_id` | Cast a vote |
| `get_friends` | `p_user_id` | List friends |
| `get_friends_descriptions` | `p_user_id, p_word_id` | Friends' descriptions |

### RPCs the Web Needs to Add
| RPC | Params | Used For |
|-----|--------|----------|
| `get_yesterday_winner` | `p_user_id, p_language` | Yesterday's results |
| `get_weekly_recap` | `p_user_id, p_language` | Weekly stats (Mondays) |
| `update_streak` | `p_user_id` | Update streak after submission |
| `submit_report` | `p_reporter_id, p_description_id, p_word_id` | Report content |
| `get_pending_requests` | `p_user_id` | Incoming friend requests |
| `search_users` | `p_query, p_current_user, p_limit, p_offset` | User search |
| `delete_own_account` | *(none — uses auth context)* | Account deletion |

### Admin-Only RPCs (NOT needed for web client)
| RPC | Purpose |
|-----|---------|
| `get_seed_accounts` | Seed bot management |
| `get_unused_seed_description` | Seed description pool |
| `submit_seed_description` | Auto-submit for seed bots |
| `mark_seed_used` | Mark seed description consumed |
| `create_seed_profile` | Create seed bot profiles |

---

## 21. Quick Checklist

### Interstitials
- [ ] **Interstitial flow** — Implement Section 1 ordering + localStorage dismissal
- [ ] **Yesterday's Winner** — Call `get_yesterday_winner` on page load, show once per game date
- [ ] **Weekly Recap** — Call `get_weekly_recap` on Mondays, show full-page recap

### Streaks & Badges
- [ ] **Streak update** — Call `update_streak` after every description submission
- [ ] **Badge display** — Show badge emoji next to usernames everywhere
- [ ] **Badge unlock celebration** — Detect new badge after submission, show celebration
- [ ] **Badge progress** — Show progress bar toward next badge tier on profile

### Voting
- [ ] **Vote batching** — Cap at 15 pairs per session, persist count in localStorage
- [ ] **Vote count persistence** — Key: `vote_progress_${wordId}_${gameDate}`
- [ ] **Author + badge display** — Show `@username ✨` on vote cards

### Results
- [ ] **Global / Friends tabs** — Segmented control on results page
- [ ] **Share cards** — Generate shareable PNG images for daily results + weekly recaps

### Friends
- [ ] **Pending requests** — Call `get_pending_requests`, show accept/decline UI
- [ ] **User search** — Call `search_users` with pagination
- [ ] **Send/accept/decline/remove** — Direct `friendships` table operations
- [ ] **Locked descriptions** — Don't reveal until user has played today

### Profile
- [ ] **Emoji avatar picker** — 16 options, persisted to `profiles.avatar_url`
- [ ] **Stats grid** — streak, best streak, plays, votes, best rank
- [ ] **Language switcher** — EN/ES toggle
- [ ] **Delete account** — Two-step confirmation + username typing

### Game Infrastructure
- [ ] **Game date rollover** — Auto-refresh at 5am UTC, countdown timer
- [ ] **Onboarding** — 3-step tutorial for new users, localStorage gate
- [ ] **Reporting** — Call `submit_report` from vote cards with confirmation dialog
- [ ] **Password recovery** — Handle `PASSWORD_RECOVERY` auth event
- [ ] **Client rate limiting** — Implement sliding window limits
- [ ] **Timezone sync** — Update `profiles.timezone` on login
- [ ] **Offline detection** — Show banner when network drops
