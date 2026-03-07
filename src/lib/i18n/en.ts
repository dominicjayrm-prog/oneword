export default {
  // Onboarding
  onboarding: {
    screen1_label: "TODAY'S WORD",
    screen1_subtitle: 'nature \u00B7 day 1',
    screen1_prompt: 'DESCRIBE IT IN EXACTLY 5 WORDS',
    screen1_counter: '5/5 words \u2713',
    screen1_example_word: 'OCEAN',
    screen1_example: ['Where', 'fish', 'pay', 'no', 'rent'],
    screen2_label: 'THE WORLD VOTES',
    screen2_title: 'Which is better?',
    screen2_subtitle: 'Tap to vote. The best descriptions rise to the top.',
    screen2_pick: 'YOUR PICK \u2713',
    screen2_progress: 'vote 4 of 15',
    screen2_desc1: 'Where fish pay no rent',
    screen2_desc2: "God's swimming pool, no lifeguard",
    screen3_label: 'CLIMB THE RANKS',
    screen3_title: 'Compete globally',
    screen3_subtitle: 'Build streaks. Top the leaderboard. Share your best.',
    screen3_entries: [
      { desc: '"Where fish pay no rent"', user: '@sara', votes: 847 },
      { desc: '"God\'s swimming pool, no lifeguard"', user: '@mike', votes: 723 },
      { desc: '"Big salty infinity bath time"', user: '@luna', votes: 694 },
    ],
    screen3_stats: [
      { label: 'DAY STREAK', value: '12' },
      { label: 'BEST RANK', value: '#3' },
      { label: 'RESULTS', value: 'share' },
    ],
  },
  nav_next: 'Next',
  nav_back: 'Back',
  nav_letsplay: "Let's play \u2192",

  // Auth
  auth: {
    tagline: '5 words. 1 winner. Every day.',
    signup_username: 'Username',
    signup_email: 'Email',
    signup_password: 'Password',
    signup_button: 'Create Account',
    login_button: 'Sign In',
    login_link: 'Need an account? Sign Up',
    signup_link: 'Have an account? Sign In',
    language_label: 'Playing in',
  },

  // Game
  game: {
    todays_word: "TODAY'S WORD",
    prompt: 'Describe it in exactly 5 words',
    placeholder: 'Type your five words...',
    submit: 'LOCK IT IN',
    your_description: 'YOUR DESCRIPTION',
    locked_in: 'Locked in',
    vote_others: 'VOTE ON OTHERS',
    see_results: 'SEE RESULTS',
    no_word: 'No word for today yet.',
    no_word_sub: 'Check back soon!',
    day_streak: '{{count}} day streak',
  },

  // Voting
  vote: {
    of: '{{current}} of {{total}}',
    tap_prefer: 'Tap the one you prefer',
    done_title: 'Voting Complete!',
    no_more: 'No More Pairs',
    voted_on: 'You voted on {{count}} pair',
    voted_on_plural: 'You voted on {{count}} pairs',
    see_results: 'SEE RESULTS',
    back_home: 'BACK HOME',
    no_pairs: 'No pairs available yet',
    report: 'Report',
    report_title: 'Report Description',
    report_message: 'Flag this description as inappropriate?',
    report_cancel: 'Cancel',
    report_confirm: 'Report',
    reported: 'Reported',
    reported_message: 'Thanks for helping keep OneWord clean.',
  },

  // Results
  results: {
    leaderboard: 'LEADERBOARD',
    no_results: 'No results yet.',
    no_results_sub: 'Vote more to see rankings!',
    share_results: 'SHARE RESULTS',
    back_home: 'BACK HOME',
    share_preview: 'Share Preview',
    share_btn: 'SHARE',
    cancel: 'CANCEL',
  },

  // Profile
  profile: {
    tap_to_change: 'Tap to change',
    member_since: 'Member since {{date}}',
    choose_avatar: 'CHOOSE AVATAR',
    current_streak: 'Current Streak',
    best_streak: 'Best Streak',
    total_plays: 'Total Plays',
    votes_received: 'Votes Received',
    best_rank: 'Best Rank',
    language: 'Language',
    back_home: 'BACK HOME',
    log_out: 'Log Out',
    log_out_title: 'Log Out',
    log_out_message: 'Are you sure you want to log out?',
    delete_account: 'Delete Account',
    deleting: 'Deleting...',
    delete_title: 'Delete Account',
    delete_message: 'This will permanently delete your account and all your data. This cannot be undone.',
    delete_confirm_title: 'Are you absolutely sure?',
    delete_confirm_message: 'All your descriptions, votes, and stats will be gone forever.',
    delete_error: 'Failed to delete account. Please try again.',
  },

  // Share card
  share: {
    todays_word: "TODAY'S WORD",
    rank: 'RANK',
    votes: 'VOTES',
    streak: 'STREAK',
    play_daily: 'Play OneWord daily',
  },

  // Friends
  friends: {
    tab_title: 'Friends',
    requests: 'Friend Requests',
    today_title: 'How your friends described it',
    play_first: "Play today's word to see your friends' descriptions",
    locked: 'Play first to reveal',
    hasnt_played: "Hasn't played yet today",
    your_friends: 'Your Friends',
    add: 'Add',
    add_friends: 'Add Friends',
    search_placeholder: 'Search by username',
    pending: 'Pending...',
    already_friends: 'Friends',
    remove: 'Remove',
    remove_confirm: 'Remove this friend?',
    remove_confirm_title: 'Remove Friend',
    accept: 'Accept',
    decline: 'Decline',
    empty_title: "Add friends to see how they describe today's word",
    empty_subtitle: 'Compare descriptions and compete with your inner circle',
    no_requests: 'No pending requests',
    max_friends: 'You can have up to 50 friends',
  },

  // Results tabs
  results_tabs: {
    global: 'Global',
    friends: 'Friends',
  },

  // Language names
  lang: {
    en: 'English',
    es: 'Espa\u00F1ol',
  },
};
