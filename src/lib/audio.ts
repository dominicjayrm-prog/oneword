import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  master: 'sound_enabled',
  game: 'sound_game_enabled',
  celebrations: 'sound_celebrations_enabled',
} as const;

// In-memory cache (loaded at app start, updated on toggle)
let masterEnabled = true;
let gameEnabled = true;
let celebrationsEnabled = true;

export interface SoundPrefs {
  master: boolean;
  game: boolean;
  celebrations: boolean;
}

/** Load sound preferences from storage into memory */
export async function loadSoundPrefs(): Promise<SoundPrefs> {
  try {
    const [m, g, c] = await AsyncStorage.multiGet([KEYS.master, KEYS.game, KEYS.celebrations]);
    masterEnabled = m[1] !== 'false';
    gameEnabled = g[1] !== 'false';
    celebrationsEnabled = c[1] !== 'false';
  } catch {
    // Defaults already set
  }
  return { master: masterEnabled, game: gameEnabled, celebrations: celebrationsEnabled };
}

/** Update a sound preference */
export async function setSoundPref(key: keyof SoundPrefs, value: boolean): Promise<void> {
  switch (key) {
    case 'master':
      masterEnabled = value;
      break;
    case 'game':
      gameEnabled = value;
      break;
    case 'celebrations':
      celebrationsEnabled = value;
      break;
  }
  try {
    await AsyncStorage.setItem(KEYS[key], String(value));
  } catch {
    // Non-critical
  }
}

/** Get current sound preferences (synchronous, from cache) */
export function getSoundPrefs(): SoundPrefs {
  return { master: masterEnabled, game: gameEnabled, celebrations: celebrationsEnabled };
}

// Sound category mapping
const GAME_SOUNDS: Set<SoundName> = new Set(['inputDesc', 'tapOnVote']);
const CELEBRATION_SOUNDS: Set<SoundName> = new Set(['confetti', 'streaks']);

// Pre-mapped sound assets
const SOUNDS = {
  confetti: require('../../assets/sounds/confetti.mp3'),
  streaks: require('../../assets/sounds/streaks.mp3'),
  inputDesc: require('../../assets/sounds/input-desc.mp3'),
  tapOnVote: require('../../assets/sounds/tap-on-vote.mp3'),
} as const;

type SoundName = keyof typeof SOUNDS;

// Cache loaded players using expo-audio
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Pre-create all audio players so they're loaded and ready when needed */
function preloadPlayers(): void {
  if (Platform.OS === 'web') return;
  for (const name of Object.keys(SOUNDS) as SoundName[]) {
    try {
      players[name] = createAudioPlayer(SOUNDS[name]);
    } catch {
      // Non-critical — player will be created on first play
    }
  }
}

async function play(name: SoundName, volume = 1.0): Promise<void> {
  // Audio not supported on web
  if (Platform.OS === 'web') return;

  // Check sound preferences
  if (!masterEnabled) return;
  if (GAME_SOUNDS.has(name) && !gameEnabled) return;
  if (CELEBRATION_SOUNDS.has(name) && !celebrationsEnabled) return;

  try {
    let player = players[name];
    if (!player) {
      player = createAudioPlayer(SOUNDS[name]);
      players[name] = player;
    }

    player.volume = volume;

    // Seek back to start if the player has already been loaded (replay).
    // Wrap in its own try-catch so a seekTo failure on an unloaded player
    // doesn't prevent play() from being called.
    if (player.isLoaded) {
      try {
        await player.seekTo(0);
      } catch {
        // seekTo can fail if player is in a transitional state — still try to play
      }
    }

    player.play();
  } catch (err) {
    // Silently fail — sounds are non-critical
    console.warn(`[audio] Failed to play "${name}":`, err);
  }
}

/** Configure audio session (call once at app start) */
export async function initAudio(): Promise<void> {
  if (Platform.OS === 'web') return;
  await loadSoundPrefs();
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // Non-critical
  }
  // Pre-create players so audio is loaded before first interaction
  preloadPlayers();
}

/**
 * App sounds — mirrors the haptic utility pattern.
 *
 * Sound mapping:
 * - inputDesc:  played when user reaches exactly 5 words (description ready)
 * - confetti:   played on first-submit celebration & streak celebration confetti
 * - tapOnVote:  played when user taps a vote card
 * - streaks:    played when streak celebration appears
 */
export const sound = {
  /** User typed exactly 5 words — description is ready */
  inputDesc: () => play('inputDesc'),
  /** Confetti burst — first submission & celebrations */
  confetti: () => play('confetti'),
  /** User taps to vote on a description */
  tapOnVote: () => play('tapOnVote'),
  /** Streak milestone celebration */
  streaks: () => play('streaks'),
};
