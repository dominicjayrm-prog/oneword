import { useState, useCallback, useEffect } from 'react';
import { Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/haptics';

interface FavouriteButtonProps {
  descriptionId: string;
  isFavourited: boolean;
  onToggle?: (nowFavourited: boolean) => void;
  size?: number;
}

export function FavouriteButton({ descriptionId, isFavourited, onToggle, size = 14 }: FavouriteButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const { showToast } = useToast();
  const [favourited, setFavourited] = useState(isFavourited);
  const [toggling, setToggling] = useState(false);

  // Sync external prop changes
  useEffect(() => {
    if (!toggling) {
      setFavourited(isFavourited);
    }
  }, [isFavourited, toggling]);

  const handleToggle = useCallback(async () => {
    if (toggling || !session?.user) {
      if (!session?.user) {
        showToast(t('errors.generic'), 'error');
      }
      return;
    }
    haptic.selection();
    setToggling(true);

    const prev = favourited;
    const next = !prev;
    setFavourited(next); // optimistic

    try {
      let result: boolean;
      if (prev) {
        // Remove favourite via direct table delete (RLS enforces ownership)
        const { error } = await supabase
          .from('favourites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('description_id', descriptionId);
        if (error) throw error;
        result = false;
      } else {
        // Add favourite via direct table insert (RLS enforces ownership)
        const { error } = await supabase
          .from('favourites')
          .insert({ user_id: session.user.id, description_id: descriptionId });
        if (error) throw error;
        result = true;
      }

      setFavourited(result);
      onToggle?.(result);
      showToast(result ? `${t('favourites.favourited')} \u2665` : t('favourites.unfavourited'), 'success');
    } catch (err) {
      console.warn('[FavouriteButton] toggle failed:', err);
      setFavourited(prev); // revert
      showToast(t('errors.generic'), 'error');
    } finally {
      setToggling(false);
    }
  }, [toggling, favourited, session, descriptionId, onToggle, showToast, t]);

  return (
    <Pressable
      onPress={handleToggle}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      disabled={toggling}
      accessibilityRole="button"
      accessibilityLabel={favourited ? t('favourites.unfavourite') : t('favourites.favourite')}
    >
      <Text style={[{ fontSize: size, color: favourited ? colors.primary : colors.textMuted }]}>
        {favourited ? '\u2665' : '\u2661'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {}),
  },
});
