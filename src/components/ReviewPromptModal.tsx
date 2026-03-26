import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { haptic } from '../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ModalState = 'rating' | 'positive' | 'negative';

export function ReviewPromptModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { session } = useAuthContext();
  const [state, setState] = useState<ModalState>('rating');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      // Reset state
      setState('rating');
      setRating(0);
      setFeedback('');
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      contentOpacity.setValue(1);
      starScales.forEach((s) => s.setValue(1));

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  }

  function handleStarPress(star: number) {
    haptic.light();
    setRating(star);

    // Bounce animation on each filled star
    const anims = [];
    for (let i = 0; i < star; i++) {
      anims.push(
        Animated.sequence([
          Animated.timing(starScales[i], { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(starScales[i], { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
      );
    }
    Animated.parallel(anims).start();

    // Transition after 600ms
    setTimeout(() => {
      // Cross-fade to next state
      Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        if (star >= 4) {
          haptic.success();
          setState('positive');
        } else {
          setState('negative');
        }
        Animated.timing(contentOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      });
    }, 600);
  }

  async function handleRateAppStore() {
    haptic.success();
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      }
    } catch {
      // Apple rate-limits this — it's fine if it doesn't show
    }
    handleClose();
  }

  async function handleSendFeedback() {
    haptic.medium();
    const userId = session?.user?.id;
    const appVersion = Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.2.0';

    try {
      await supabase.from('app_feedback').insert({
        user_id: userId || null,
        star_rating: rating,
        feedback_text: feedback.trim() || null,
        app_version: appVersion,
      });
    } catch {
      // Non-critical — don't block the user
    }
    handleClose();
  }

  function renderStars(size: number, gap: number) {
    return (
      <View style={[styles.starsRow, { gap }]}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rating;
          const scale = state === 'rating' ? starScales[star - 1] : new Animated.Value(1);
          return (
            <TouchableOpacity
              key={star}
              onPress={state === 'rating' ? () => handleStarPress(star) : undefined}
              activeOpacity={state === 'rating' ? 0.7 : 1}
              style={styles.starHitbox}
              disabled={state !== 'rating'}
            >
              <Animated.Text style={[{ fontSize: size, transform: [{ scale }] }]}>
                {filled ? '\u2605' : '\u2606'}
              </Animated.Text>
              <View
                style={[
                  styles.starColor,
                  { backgroundColor: filled ? '#FF6B4A' : '#E0DCD4' },
                  { width: size, height: size, borderRadius: size / 2 },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Close button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeText}>{'\u2715'}</Text>
              </TouchableOpacity>

              <Animated.View style={{ opacity: contentOpacity }}>
                {state === 'rating' && (
                  <View style={styles.content}>
                    {/* Heart icon circle */}
                    <View style={styles.heartCircle}>
                      <Text style={styles.heartIcon}>{'\u2665'}</Text>
                    </View>
                    <Text style={styles.title}>{t('review.title')}</Text>
                    <Text style={styles.subtitle}>{t('review.subtitle')}</Text>

                    {/* Stars */}
                    <View style={styles.starsContainer}>
                      <View style={[styles.starsRow, { gap: 8 }]}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= rating;
                          return (
                            <TouchableOpacity
                              key={star}
                              onPress={() => handleStarPress(star)}
                              activeOpacity={0.7}
                              style={styles.starHitbox}
                            >
                              <Animated.Text
                                style={{
                                  fontSize: 36,
                                  color: filled ? '#FF6B4A' : '#E0DCD4',
                                  transform: [{ scale: starScales[star - 1] }],
                                }}
                              >
                                {'\u2605'}
                              </Animated.Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <Text style={styles.tapHint}>{t('review.tap_hint')}</Text>
                  </View>
                )}

                {state === 'positive' && (
                  <View style={styles.content}>
                    {/* Small stars */}
                    <View style={[styles.starsRow, { gap: 6, marginBottom: 16 }]}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{ fontSize: 28, color: star <= rating ? '#FF6B4A' : '#E0DCD4' }}>
                          {'\u2605'}
                        </Text>
                      ))}
                    </View>

                    <Text style={styles.title}>{t('review.positive_title')}</Text>
                    <Text style={styles.subtitle}>{t('review.positive_subtitle')}</Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleRateAppStore} activeOpacity={0.8}>
                      <Text style={styles.primaryBtnText}>{t('review.positive_cta')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose} activeOpacity={0.7}>
                      <Text style={styles.secondaryBtnText}>{t('review.positive_later')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {state === 'negative' && (
                  <View style={styles.content}>
                    {/* Small stars */}
                    <View style={[styles.starsRow, { gap: 6, marginBottom: 16 }]}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{ fontSize: 28, color: star <= rating ? '#FF6B4A' : '#E0DCD4' }}>
                          {'\u2605'}
                        </Text>
                      ))}
                    </View>

                    <Text style={styles.title}>{t('review.negative_title')}</Text>
                    <Text style={styles.subtitle}>{t('review.negative_subtitle')}</Text>

                    <TextInput
                      style={styles.textInput}
                      multiline
                      numberOfLines={4}
                      placeholder={t('review.negative_placeholder')}
                      placeholderTextColor="#C4C0CE"
                      value={feedback}
                      onChangeText={setFeedback}
                      textAlignVertical="top"
                    />

                    <TouchableOpacity style={styles.darkBtn} onPress={handleSendFeedback} activeOpacity={0.8}>
                      <Text style={styles.darkBtnText}>{t('review.negative_cta')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleClose} activeOpacity={0.7}>
                      <Text style={styles.secondaryBtnText}>{t('review.negative_skip')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#8B8697',
  },
  content: {
    alignItems: 'center',
  },
  heartCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B4A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heartIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#8B8697',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  starsContainer: {
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starHitbox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starColor: {
    position: 'absolute',
    opacity: 0,
  },
  tapHint: {
    fontSize: 11,
    color: '#8B8697',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#FF6B4A',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  darkBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  darkBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#8B8697',
  },
  textInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1A1A2E',
    minHeight: 80,
    marginBottom: 16,
  },
});
