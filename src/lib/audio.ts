import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Pre-mapped sound assets
const SOUNDS = {
  confetti: require('../../assets/sounds/confetti.mp3'),
  streaks: require('../../assets/sounds/streaks.mp3'),
  inputDesc: require('../../assets/sounds/input-desc.mp3'),
  tapOnVote: require('../../assets/sounds/tap-on-vote.mp3'),
} as const;

type SoundName = keyof typeof SOUNDS;

// Cache loaded sounds using expo-av (more reliable for one-shot playback)
const loaded: Partial<Record<SoundName, Audio.Sound>> = {};

async function play(name: SoundName, volume = 1.0): Promise<void> {
  // Audio not supported on web
  if (Platform.OS === 'web') return;

  try {
    let snd = loaded[name];
    if (!snd) {
      const { sound: newSound } = await Audio.Sound.createAsync(SOUNDS[name], {
        shouldPlay: false,
        volume,
      });
      snd = newSound;
      loaded[name] = snd;
    }

    await snd.setPositionAsync(0);
    await snd.setVolumeAsync(volume);
    await snd.playAsync();
  } catch (err) {
    // Silently fail — sounds are non-critical
    console.warn(`[audio] Failed to play "${name}":`, err);
  }
}

/** Configure audio session (call once at app start) */
export async function initAudio(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // Non-critical
  }
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
