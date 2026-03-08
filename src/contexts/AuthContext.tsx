import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import i18n from '../lib/i18n';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  language: string;
  pendingVerification: string | null; // email address awaiting verification
  signUp: (email: string, password: string, username: string, lang?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ error: Error | null }>;
  updateLanguage: (lang: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  resendVerification: () => Promise<{ error: Error | null }>;
  clearPendingVerification: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  language: i18n.language,
  pendingVerification: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateAvatar: async () => ({ error: null }),
  updateLanguage: async () => ({ error: null }),
  deleteAccount: async () => ({ error: null }),
  resendVerification: async () => ({ error: null }),
  clearPendingVerification: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setPendingVerification(null);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist — create it from auth metadata
        const { data: { user } } = await supabase.auth.getUser();
        const username = user?.user_metadata?.username || 'player_' + userId.slice(0, 8);
        const lang = user?.user_metadata?.language || 'en';

        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ id: userId, username, language: lang })
          .select('*')
          .single();

        setProfile(newProfile);
        if (newProfile?.language) {
          setLanguage(newProfile.language);
          i18n.changeLanguage(newProfile.language);
        }
        return;
      }

      if (error) {
        console.error('Failed to fetch profile:', error.message);
      }
      setProfile(data);
      if (data?.language) {
        setLanguage(data.language);
        i18n.changeLanguage(data.language);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }

  async function signUp(email: string, password: string, username: string, lang?: string) {
    const userLang = lang || language;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, language: userLang } },
    });

    if (error) {
      // If the trigger failed, try to recover by creating the profile manually
      if (error.message?.includes('Database error') && data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username,
            language: userLang,
          }, { onConflict: 'id' });
        if (profileError) {
          return { error: new Error(profileError.message) };
        }
        await fetchProfile(data.user.id);
        return { error: null };
      }
      return { error };
    }

    // Email confirmation required: user exists but no session yet
    if (data?.user && !data.session) {
      setPendingVerification(email);
      return { error: null };
    }

    // Ensure the profile exists with the correct username
    if (data?.user) {
      // Small delay to let the trigger complete first
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        // Trigger didn't create the profile — create it manually
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            language: userLang,
          });
      } else if (existingProfile.username !== username && existingProfile.username.startsWith('player_')) {
        // Trigger created a fallback username — update to the real one
        await supabase
          .from('profiles')
          .update({ username })
          .eq('id', data.user.id);
      }

      // Refresh profile state so the UI shows the correct username
      await fetchProfile(data.user.id);
    }

    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function updateAvatar(avatarUrl: string) {
    if (!session?.user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    }
    return { error };
  }

  async function updateLanguage(lang: string) {
    setLanguage(lang);
    i18n.changeLanguage(lang);

    if (!session?.user) return { error: null };
    const { error } = await supabase
      .from('profiles')
      .update({ language: lang, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, language: lang } : prev);
    }
    return { error };
  }

  async function deleteAccount() {
    if (!session?.user) return { error: new Error('Not signed in') };
    const { error } = await supabase.rpc('delete_own_account');
    if (!error) {
      await supabase.auth.signOut();
    }
    return { error };
  }

  async function resendVerification() {
    if (!pendingVerification) return { error: new Error('No pending verification') };
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingVerification });
    return { error };
  }

  function clearPendingVerification() {
    setPendingVerification(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, language, pendingVerification, signUp, signIn, signOut, refreshProfile, updateAvatar, updateLanguage, deleteAccount, resendVerification, clearPendingVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
