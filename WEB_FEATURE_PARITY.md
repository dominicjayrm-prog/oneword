# OneWord Web — Feature Parity Guide

Complete documentation of every iOS feature the web app needs to replicate.
All features share the same Supabase project and database.

---

## Table of Contents

1. [Yesterday's Winner / Daily Recap](#1-yesterdays-winner--daily-recap)
2. [Weekly Recap](#2-weekly-recap)
3. [Streak System & Badge Tiers](#3-streak-system--badge-tiers)
4. [Streak Celebration (Badge Unlock Animation)](#4-streak-celebration-badge-unlock-animation)
5. [Share Card (Daily Result)](#5-share-card-daily-result)
6. [Weekly Recap Share Card](#6-weekly-recap-share-card)
7. [Friends System](#7-friends-system)
8. [Description Reporting](#8-description-reporting)
9. [Account Deletion](#9-account-deletion)
10. [Onboarding Flow](#10-onboarding-flow)
11. [Game Date Rollover Logic](#11-game-date-rollover-logic)
12. [Network Offline Banner](#12-network-offline-banner)
13. [Rate Limiting (Client-Side)](#13-rate-limiting-client-side)
14. [Timezone Syncing](#14-timezone-syncing)
15. [Password Recovery Flow](#15-password-recovery-flow)
16. [Profile Features](#16-profile-features)
17. [Complete RPC Reference](#17-complete-rpc-reference)

---

## 1. Yesterday's Winner / Daily Recap

### What it does
Shows the winning description from yesterday's word, the winner's username and vote count. If the current user played yesterday, it also shows their rank and description. If the user *was* the winner, a celebration variant is displayed.

### RPC

```
get_yesterday_winner(p_user_id uuid, p_language text)
```

### Parameters
| Param | Type | Description |
|-------|------|-------------|
| `p_user_id` | `uuid` | Current authenticated user's ID |
| `p_language` | `text` | User's language preference (`'en'` or `'es'`) |

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
- **UI component**: `src/components/YesterdayWinnerCard.tsx` — Full card with animations

### Business Logic
- Called on app open / main screen load
- Returns `null` if `data[0].winner_description` is falsy (no winner yet or no previous day data)
- **Two UI variants:**
  1. **User won** (`user_was_winner === true`): Celebration card with gold border, "YOU WON 🎉" header, haptic success feedback
  2. **Normal**: Shows winner info, then user's own rank/description, or "You didn't play yesterday" message
- Card is dismissible — user taps "See today's word" button to proceed
- Animated entrance with staggered spring animations (card slide up, medal scale, description fade, etc.)

### When to Show
- Shown **once per session** on the main play screen before showing today's word
- Only shown if the RPC returns data (i.e., there was a game yesterday with at least one submission)
- The web should show this as an interstitial or modal on first visit each day

---

## 2. Weekly Recap

### What it does
Full-screen recap of the user's performance over the past week. Includes best description, days played visualization, stats grid, and a shareable image.

### RPC

```
get_weekly_recap(p_user_id uuid, p_language text)
```

### Parameters
| Param | Type | Description |
|-------|------|-------------|
| `p_user_id` | `uuid` | Current authenticated user's ID |
| `p_language` | `text` | User's language preference (`'en'` or `'es'`) |

### Response Shape

```typescript
interface WeeklyRecap {
  days_played: number;                    // 0-7, how many days user submitted
  total_votes_received: number;           // Total votes across all descriptions
  best_rank: number | null;               // Best rank achieved this week
  best_rank_word: string | null;          // The word for which they got best rank
  best_rank_description: string | null;   // Their description that got best rank
  best_rank_total_players: number | null; // Total players on the day of best rank
  average_rank: number | null;            // Average rank across all days played
  previous_week_average_rank: number | null; // Last week's avg rank (for comparison)
  current_streak: number;                 // Current streak count
  total_descriptions_submitted: number;   // Total descriptions this week
  perfect_week: boolean;                  // True if played all 7 days
  week_start: string;                     // 'YYYY-MM-DD' (Monday)
  week_end: string;                       // 'YYYY-MM-DD' (Sunday)
}
```

### iOS Code Location
- **RPC call**: `src/contexts/GameContext.tsx:241-257` — `getWeeklyRecap()`
- **UI component**: `src/components/WeeklyRecap.tsx` — Full-screen animated recap
- **Share card**: `src/components/WeeklyRecapShareCard.tsx` — Rendered off-screen, captured as PNG

### Business Logic
- Returns `null` if `data[0].days_played === 0` (user didn't play at all that week)
- **Displayed sections:**
  1. **Header**: "YOUR WEEK IN REVIEW" label + date range (e.g. "Mar 3 - Mar 9")
  2. **Best of the Week card**: Best word (uppercase), best description (italic), rank with emoji
  3. **Days played**: 7 circles (filled = played, empty = missed). Shows "PERFECT WEEK 🔥" if all 7
  4. **Stats grid (2x2)**: Votes received, Average rank (with improvement indicator if `average_rank < previous_week_average_rank`), Best rank, Streak with badge emoji
  5. **Share button**: Captures a `WeeklyRecapShareCard` as PNG and opens native share sheet
  6. **Dismiss button**: "See today's word"
- Uses dark theme overlay (hardcoded `#1A1A2E` + `#2D1B69` backgrounds) regardless of user theme
- Heavy staggered animations (~2.5s total entrance sequence)
- Haptic feedback: `success` for perfect week, `light` otherwise

### When to Show
- Should be shown on **Monday** (or the first session after Monday) for the previous week
- The `getGameDay()` function returns `1` for Monday (uses game date, not wall clock)
- Show **before** the yesterday winner card if both apply
- The web can use `getGameMonday()` from `src/lib/gameDate.ts` to determine the relevant week

### Share Image
- 320x400px card with dark purple gradient background
- Contains: OneWord logo, "YOUR WEEK IN REVIEW" label, date range, best word + description + rank, stats line, "playoneword.app" footer
- Captured at 960x1200 (3x scale) for quality

---

## 3. Streak System & Badge Tiers

### What it does
Users earn badge tiers based on consecutive days played. Badges are displayed next to usernames throughout the app.

### Streak Update RPC

```
update_streak(p_user_id uuid)
```

Called immediately after a successful description submission (`src/contexts/GameContext.tsx:149`).

### Badge Tiers (from `src/lib/badges.ts`)

| Streak | Emoji | Name (EN) | Name (ES) | Color |
|--------|-------|-----------|-----------|-------|
| 3 | ✨ | Spark | Chispa | `#FF8A6B` |
| 7 | 🔥 | On Fire | En Llamas | `#FF6B4A` |
| 14 | ⚡ | Unstoppable | Imparable | `#4A9BFF` |
| 30 | 👑 | Crowned | Coronado | `#FFD700` |
| 50 | 💎 | Diamond | Diamante | `#88E5FF` |
| 100 | ⭐ | Legend | Leyenda | `#FFD700` |
| 365 | ♾️ | Eternal | Eterno | `#FF6B4A` |

### Helper Functions (all in `src/lib/badges.ts`)

```typescript
// Returns the highest badge tier the user has achieved (or null)
getCurrentBadge(streak: number): BadgeTier | null

// Returns the next badge tier to unlock (or null if maxed)
getNextBadge(streak: number): BadgeTier | null

// Returns 0-1 progress fraction toward next tier
getProgressToNext(streak: number): number
```

### Where Badges Appear
- **Leaderboard rows**: `streak_badge_emoji` field from `get_leaderboard` RPC
- **Vote cards**: `desc1_badge_emoji` / `desc2_badge_emoji` from `get_vote_pair` RPC
- **Friends list**: `friend_badge_emoji` field
- **Profile**: `BadgePill` component (`src/components/BadgePill.tsx`)
- **Badge progress bar**: `BadgeProgress` component (`src/components/BadgeProgress.tsx`)

### Profile Fields
The `profiles` table stores:
- `current_streak: number`
- `longest_streak: number`
- `streak_badge_emoji: string | null`
- `streak_badge_name: string | null`

These are updated server-side by `update_streak` RPC.

---

## 4. Streak Celebration (Badge Unlock Animation)

### What it does
Full-screen celebration when a user unlocks a new badge tier (crosses a streak threshold after submitting a description).

### iOS Code Location
- `src/components/StreakCelebration.tsx`

### Trigger Logic
After `submitDescription()` succeeds:
1. Compare `oldStreak` (before submission) with new streak (after `refreshProfile()`)
2. If `getCurrentBadge(newStreak)` differs from `getCurrentBadge(oldStreak)`, show the celebration

### UI Elements
- Full-screen overlay with badge-themed gradient background (`badge.bgGrad`)
- Confetti particle system (35 particles, 50 for Eternal tier)
- Ring burst animations (3 rings, 5 for Eternal)
- Badge emoji (80px), streak number, badge name, tagline
- Stats row: days played, best rank, total votes received
- Next milestone with progress bar (or "highest tier" for Eternal)
- Haptic: `heavy` on confetti burst, extra `success` for Eternal
- Tap anywhere to dismiss

### Web Implementation Notes
- Replace haptics with visual-only feedback
- Confetti can use a library like `canvas-confetti` or CSS animations
- The gradient background colors and glow colors come from `BadgeTier.bgGrad`, `BadgeTier.color`, and `BadgeTier.glow`

---

## 5. Share Card (Daily Result)

### What it does
Generates a shareable image of the user's daily result (word, description, rank, votes, streak).

### iOS Code Location
- `src/components/ShareCard.tsx`

### Props / Data Needed

```typescript
{
  word: string;              // Today's word
  description: string | null; // User's description
  rank: number | null;       // User's rank
  votes: number | null;      // Votes received
  streak: number;            // Current streak
}
```

### Image Spec
- 320x400px rendered, captured at 960x1200 (3x)
- Dark purple gradient: `#1A1A2E` base + `#2D1B69` overlay at 55% opacity
- OneWord logo (Playfair Display font)
- "TODAY'S WORD" label, hero word, description in quotes, stats row (rank/votes/streak), "playoneword.app" footer

### Web Implementation
- Use `html2canvas` or a server-side image generator
- Or build a shareable URL with og:image meta tags

---

## 6. Weekly Recap Share Card

Same as above but for weekly stats. See `src/components/WeeklyRecapShareCard.tsx`.

### Data
- `WeeklyRecap` object + `dateRange` string
- Shows: logo, "YOUR WEEK IN REVIEW", date range, best word + description + rank, stats line (days/votes/streak), footer

---

## 7. Friends System

### Overview
Users can search for other players, send friend requests, accept/decline requests, view friends' descriptions for today's word, and see a friends-only leaderboard.

### RPCs the Web Already Calls
- `get_friends(p_user_id)` — List of accepted friends
- `get_friends_descriptions(p_user_id, p_word_id)` — Friends' descriptions for a specific word

### RPCs the Web Is Missing

#### `get_pending_requests(p_user_id uuid)`
Returns incoming friend requests awaiting acceptance.

```typescript
interface PendingRequest {
  friendship_id: string;
  requester_id: string;
  requester_username: string;
  requester_avatar_url: string | null;
  created_at: string;
}
```

**iOS location**: `src/lib/friends.ts:80-110` — `getPendingRequests()`

#### `search_users(p_query text, p_current_user uuid, p_limit int, p_offset int)`
Search users by username with friend/pending status pre-computed.

```typescript
interface UserSearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  is_friend: boolean;         // Already friends
  request_pending: boolean;   // Request already sent
}
```

**iOS location**: `src/lib/friends.ts:153-193` — `searchUsers()`
**Page size**: `SEARCH_PAGE_SIZE = 10`, uses offset-based pagination

### Direct Table Operations (No RPC)

#### Send Friend Request
```typescript
await supabase.from('friendships').insert({
  requester_id: currentUserId,
  addressee_id: targetUserId,
  status: 'pending',
});
```
**iOS location**: `src/lib/friends.ts:195-214` — `sendFriendRequest()`

#### Accept Friend Request
```typescript
await supabase.from('friendships')
  .update({ status: 'accepted', updated_at: new Date().toISOString() })
  .eq('id', friendshipId);
```
**iOS location**: `src/lib/friends.ts:216-223` — `acceptFriendRequest()`

#### Decline / Remove Friend
```typescript
await supabase.from('friendships')
  .delete()
  .eq('id', friendshipId);
```
**iOS location**: `src/lib/friends.ts:225-241` — `declineFriendRequest()` / `removeFriend()`

### UI Components
| Component | File | Purpose |
|-----------|------|---------|
| `AddFriendModal` | `src/components/AddFriendModal.tsx` | Search + send requests modal |
| `FriendRequests` | `src/components/FriendRequests.tsx` | Incoming request cards with accept/decline |
| `FriendsList` | `src/components/FriendsList.tsx` | List of accepted friends |
| `FriendsToday` | `src/components/FriendsToday.tsx` | Friends' descriptions for today's word |
| `FriendsLeaderboard` | `src/components/FriendsLeaderboard.tsx` | Mini leaderboard of friends |

### Business Logic
- Friends' descriptions are **locked** until the current user has submitted their own description (`userHasPlayed` flag). Shows "🔒 Play today to unlock" message.
- Self-requests blocked client-side (`requesterId === addresseeId`)
- Rate limited: 10 friend requests per 60s, 15 searches per 10s

---

## 8. Description Reporting

### RPC

```
submit_report(p_reporter_id uuid, p_description_id uuid, p_word_id uuid)
```

### iOS Code Location
- **RPC call**: `src/contexts/GameContext.tsx:203-218` — `reportDescription()`
- **UI trigger**: `src/components/VoteCard.tsx` — Small "Report" link below each vote card

### Business Logic
- Rate limited: 5 reports per 60s (client-side)
- Reports are stored in the `reports` table (managed via admin panel)

---

## 9. Account Deletion

### RPC

```
delete_own_account()
```

No parameters — uses the authenticated session context server-side.

### iOS Code Location
- `src/contexts/AuthContext.tsx:285-292` — `deleteAccount()`
- Signs out the user after successful deletion

---

## 10. Onboarding Flow

### What it does
3-screen animated tutorial shown to new users explaining the game.

### Screens
1. **Screen 1** (`OnboardingScreen1.tsx`): "Today's Word" concept — shows an example word (e.g. "Rain") with animated word pills appearing one by one, plus a 5/5 counter
2. **Screen 2** (`OnboardingScreen2.tsx`): Voting mechanic — two description cards slide in from left/right, one gets "picked" with a selection animation, progress bar fills
3. **Screen 3** (`OnboardingScreen3.tsx`): Leaderboard — shows mock leaderboard with gold/silver/bronze entries, stats row (streak/trophies/votes)

### Additional Components
- `DotIndicator.tsx` — Page dots showing current position
- `WordPill.tsx` — Animated word badge

### Business Logic
- Shown only once (on first launch after signup)
- Each screen has an `isActive` prop that triggers entrance animations when swiped to
- All text is localized (EN/ES via i18n keys under `onboarding.*`)

### Web Implementation
- Build as a swipeable carousel or stepped modal
- Can simplify animations to CSS transitions
- Track `has_seen_onboarding` in localStorage or a profile flag

---

## 11. Game Date Rollover Logic

### Critical: Game day boundary is 5:00 AM UTC

From `src/lib/gameDate.ts`:

```typescript
const ROLLOVER_HOUR_UTC = 5;

// Current "game date" — before 5am UTC = yesterday's game
function getGameDate(): string {
  const now = new Date();
  const adjusted = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

// Milliseconds until next word (5am UTC)
function msUntilNextWord(): number { ... }

// Check if game date changed (for auto-refresh)
function hasWordRolledOver(lastKnownGameDate: string): boolean { ... }

// Day of week for game date (0=Sun..6=Sat)
function getGameDay(): number { ... }

// Monday of the week for a game date
function getGameMonday(gameDateStr?: string): string { ... }
```

### iOS Auto-Refresh Behavior
- Polls every 60s to check if game date rolled over (`src/contexts/GameContext.tsx:86-107`)
- Also checks on app foreground (AppState change)
- When rollover detected: re-fetches today's word, resets submission state

### Web Implementation
- Use `setInterval` + `visibilitychange` event to replicate this
- Show a countdown timer using `msUntilNextWord()`

---

## 12. Network Offline Banner

### What it does
Animated banner slides down when device loses internet connection.

### iOS Code Location
- `src/components/NetworkBanner.tsx`
- Uses `@react-native-community/netinfo`

### Web Implementation
- Use `navigator.onLine` + `online`/`offline` events

---

## 13. Rate Limiting (Client-Side)

From `src/lib/rateLimit.ts` — sliding window rate limiter:

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

These are **UX-level protections only** — server-side enforcement is separate.

---

## 14. Timezone Syncing

### What it does
On every profile fetch, syncs the device's timezone to the `profiles.timezone` column if it changed.

### iOS Code Location
- `src/contexts/AuthContext.tsx:98-110` — `syncTimezone()`

```typescript
const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (deviceTimezone !== storedTimezone) {
  await supabase.from('profiles')
    .update({ timezone: deviceTimezone })
    .eq('id', userId);
}
```

### Web Implementation
- Same logic using `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Run on login / session restore

---

## 15. Password Recovery Flow

### iOS Code Location
- `src/contexts/AuthContext.tsx:304-320`

### Flow
1. User enters email, app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'oneword://reset-password' })`
2. User clicks email link → deep link opens app with `PASSWORD_RECOVERY` event
3. App sets `passwordRecovery: true` state, shows password update form
4. User enters new password → `supabase.auth.updateUser({ password: newPassword })`

### Web Implementation
- Change `redirectTo` to your web URL (e.g. `https://yourapp.com/reset-password`)
- Handle the `PASSWORD_RECOVERY` auth event from Supabase
- Show inline password reset form

---

## 16. Profile Features

### Fields Displayed (from `profiles` table)

```typescript
interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;       // Emoji avatar
  language: string;                // 'en' or 'es'
  timezone: string;
  current_streak: number;
  longest_streak: number;
  total_plays: number;
  total_votes_received: number;
  best_rank: number | null;
  streak_badge_emoji: string | null;
  streak_badge_name: string | null;
  last_played_date: string | null;
  created_at: string;
  updated_at: string;
}
```

### Editable Fields
- **Avatar**: `supabase.from('profiles').update({ avatar_url })` — emoji-based, not image upload
- **Language**: `supabase.from('profiles').update({ language })` — switches i18n + profile

### iOS Code Location
- `src/contexts/AuthContext.tsx:258-283` — `updateAvatar()`, `updateLanguage()`

---

## 17. Complete RPC Reference

### RPCs the Web Already Uses
| RPC | Params | Used For |
|-----|--------|----------|
| `get_today_word` | `p_language` | Fetch today's word |
| `get_leaderboard` | `p_word_id, p_limit` | Today's leaderboard |
| `get_vote_pair` | `p_word_id, p_voter_id` | Get two descriptions to vote on |
| `submit_vote` | `p_voter_id, p_word_id, p_winner_id, p_loser_id` | Cast a vote |
| `get_friends` | `p_user_id` | List friends |
| `get_friends_descriptions` | `p_user_id, p_word_id` | Friends' descriptions |

### RPCs the Web Needs to Add
| RPC | Params | Used For |
|-----|--------|----------|
| `get_yesterday_winner` | `p_user_id, p_language` | Yesterday's results recap |
| `get_weekly_recap` | `p_user_id, p_language` | Weekly performance summary |
| `update_streak` | `p_user_id` | Update streak after submission |
| `submit_report` | `p_reporter_id, p_description_id, p_word_id` | Report inappropriate content |
| `get_pending_requests` | `p_user_id` | Incoming friend requests |
| `search_users` | `p_query, p_current_user, p_limit, p_offset` | Search for users to add |
| `delete_own_account` | *(none — uses auth context)* | Account deletion |

### Admin-Only RPCs (NOT needed for web client)
| RPC | Purpose |
|-----|---------|
| `get_seed_accounts` | Seed bot management |
| `get_unused_seed_description` | Seed description pool |
| `submit_seed_description` | Auto-submit for seed bots |
| `mark_seed_used` | Mark seed description as consumed |
| `create_seed_profile` | Create seed bot profiles |

---

## Quick Checklist for Web Team

- [ ] **Yesterday's Winner** — Call `get_yesterday_winner` on page load, show interstitial
- [ ] **Weekly Recap** — Call `get_weekly_recap` on Mondays, show full-page recap with share
- [ ] **Streak badges** — Display badge emoji next to usernames everywhere (leaderboard, votes, friends)
- [ ] **Badge unlock celebration** — Detect new badge after submission, show celebration
- [ ] **Share cards** — Generate shareable images for daily results and weekly recaps
- [ ] **Pending friend requests** — Call `get_pending_requests`, show accept/decline UI
- [ ] **User search** — Call `search_users` with pagination for add-friend flow
- [ ] **Send/accept/decline/remove friend** — Direct `friendships` table operations
- [ ] **Description reporting** — Call `submit_report` from vote cards
- [ ] **Account deletion** — Call `delete_own_account` from settings
- [ ] **Onboarding** — 3-step tutorial for new users
- [ ] **Game date rollover** — Auto-refresh at 5am UTC, countdown timer
- [ ] **Offline detection** — Show banner when network drops
- [ ] **Client rate limiting** — Implement sliding window limits
- [ ] **Timezone sync** — Update `profiles.timezone` on login
- [ ] **Password recovery** — Handle `PASSWORD_RECOVERY` auth event
- [ ] **Streak update** — Call `update_streak` after every description submission
- [ ] **Badge progress** — Show progress bar toward next badge tier
- [ ] **Locked friends' descriptions** — Don't reveal until user has played today
