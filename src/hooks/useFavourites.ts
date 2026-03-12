import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * Hook to batch-check which description IDs are favourited by the current user.
 * Returns a Set of favourited description IDs and a function to check/refresh.
 */
export function useFavouritedIds() {
  const { session } = useAuthContext();
  const [favouritedIds, setFavouritedIds] = useState<Set<string>>(new Set());

  const checkFavourited = useCallback(
    async (descriptionIds: string[]) => {
      if (!session?.user || descriptionIds.length === 0) {
        setFavouritedIds(new Set());
        return;
      }
      try {
        const { data, error } = await supabase
          .from('favourites')
          .select('description_id')
          .eq('user_id', session.user.id)
          .in('description_id', descriptionIds);
        if (!error && data) {
          setFavouritedIds(new Set(data.map((r: { description_id: string }) => r.description_id)));
        }
      } catch {
        // silent — non-critical
      }
    },
    [session],
  );

  const toggleLocal = useCallback((descriptionId: string, nowFavourited: boolean) => {
    setFavouritedIds((prev) => {
      const next = new Set(prev);
      if (nowFavourited) {
        next.add(descriptionId);
      } else {
        next.delete(descriptionId);
      }
      return next;
    });
  }, []);

  return { favouritedIds, checkFavourited, toggleLocal };
}
