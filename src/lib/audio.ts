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

// Cache loaded sounds to avoid re-loading on every play
const loaded: Partial<Record<SoundName, Audio.Sound>> = {};

async function play(name: SoundName, volume = 1.0): Promise<void> {
  // Audio not supported on web in expo-av
  if (Platform.OS === 'web') return;

  try {
    // Reuse cached instance if it exists
    let sound = loaded[name];
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.setPositionAsync(0);
        await sound.setVolumeAsync(volume);
        await sound.playAsync();
        return;
      }
      // Sound was unloaded — fall through to re-create
    }

    const { sound: newSound } = await Audio.Sound.createAsync(SOUNDS[name], {
      shouldPlay: true,
      volume,
    });
    loaded[name] = newSound;

    // Clean up when playback finishes
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        // Don't unload — keep cached for fast replays
      }
    });
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
