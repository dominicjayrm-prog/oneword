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
  signUp: (email: string, password: string, username: string, lang?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ error: Error | null }>;
  updateLanguage: (lang: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  language: i18n.language,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateAvatar: async () => ({ error: null }),
  updateLanguage: async () => ({ error: null }),
  deleteAccount: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, language: lang || language } },
    });
    return { error };
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, language, signUp, signIn, signOut, refreshProfile, updateAvatar, updateLanguage, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
