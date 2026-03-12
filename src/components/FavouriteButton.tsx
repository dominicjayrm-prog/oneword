import { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
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
    if (toggling || !session?.user) return;
    haptic.selection();
    setToggling(true);

    const prev = favourited;
    const next = !prev;
    setFavourited(next); // optimistic

    try {
      const { data, error } = await supabase.rpc('toggle_favourite', {
        p_user_id: session.user.id,
        p_description_id: descriptionId,
      });
      if (error) throw error;

      const result = typeof data === 'boolean' ? data : next;
      setFavourited(result);
      onToggle?.(result);
      showToast(result ? `${t('favourites.favourited')} \u2665` : t('favourites.unfavourited'), 'success');
    } catch {
      setFavourited(prev); // revert
    } finally {
      setToggling(false);
    }
  }, [toggling, favourited, session, descriptionId, onToggle, showToast, t]);

  return (
    <TouchableOpacity
      onPress={handleToggle}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.6}
      style={styles.button}
      disabled={toggling}
    >
      <Text style={[{ fontSize: size, color: favourited ? colors.primary : colors.textMuted }]}>
        {favourited ? '\u2665' : '\u2661'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
