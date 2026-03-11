import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { rateLimits, resetRateLimit } from '../lib/rateLimit';
import { PROFILE_POLL_MAX_RETRIES, PROFILE_POLL_BASE_MS } from '../constants/app';
import i18n from '../lib/i18n';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  language: string;
  pendingVerification: string | null; // email address awaiting verification
  passwordRecovery: boolean; // true when user clicked reset link and needs to set new password
  signUp: (email: string, password: string, username: string, lang?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ error: Error | null }>;
  updateLanguage: (lang: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  resendVerification: () => Promise<{ error: Error | null }>;
  clearPendingVerification: () => void;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

// Strict default: throws if used outside <AuthProvider>.
// This catches bugs early instead of silently returning null/noop stubs.
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      if (session?.user) {
        setPendingVerification(null);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Handle deep links (e.g. password reset link opens app with tokens in URL)
    const ALLOWED_SCHEMES = ['oneword://', 'com.oneword.app://'];

    function isAllowedDeepLink(url: string): boolean {
      const lower = url.toLowerCase();
      return ALLOWED_SCHEMES.some((scheme) => lower.startsWith(scheme))
        || lower.startsWith('https://oneword.app/')
        || lower.startsWith('https://www.oneword.app/');
    }

    // Validate that a string looks like a safe auth code (alphanumeric + URL-safe chars only)
    function isSafeAuthCode(code: string): boolean {
      return /^[a-zA-Z0-9_\-]+$/.test(code) && code.length < 512;
    }

    // Validate that a string looks like a safe JWT token
    function isSafeToken(token: string): boolean {
      return /^[a-zA-Z0-9_\-\.]+$/.test(token) && token.length < 8192;
    }

    function handleDeepLink(event: { url: string }) {
      const url = event.url;
      if (!url || !isAllowedDeepLink(url)) return;

      // PKCE flow (Supabase v2 default): redirect has ?code=AUTH_CODE as query param
      const codeMatch = url.match(/[?&]code=([^&#]+)/);
      if (codeMatch) {
        const code = decodeURIComponent(codeMatch[1]);
        if (!isSafeAuthCode(code)) {
          console.error('Deep link contained invalid auth code');
          return;
        }
        supabase.auth.exchangeCodeForSession(code).catch((err) => {
          console.error('Failed to exchange code for session:', err);
        });
        return;
      }

      // Implicit flow fallback: tokens in hash fragment
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;
      const params = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        if (!isSafeToken(accessToken) || !isSafeToken(refreshToken)) {
          console.error('Deep link contained invalid tokens');
          return;
        }
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch((err) => {
          console.error('Failed to set session from hash fragment:', err);
        });
      }
    }

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  async function syncTimezone(userId: string, storedTimezone: string | null) {
    try {
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (deviceTimezone && deviceTimezone !== storedTimezone) {
        await supabase
          .from('profiles')
          .update({ timezone: deviceTimezone })
          .eq('id', userId);
      }
    } catch (err) {
      console.warn('[AuthContext] Timezone sync failed:', err);
    }
  }

  // Guard to prevent fetchProfile from racing with signUp's profile creation.
  // signUp sets this before its own upsert so that concurrent fetchProfile calls
  // skip the "create from metadata" path and just wait for signUp to finish.
  // Uses a ref so the value persists across renders and isn't reset.
  const signUpInProgressRef = useRef(false);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet.
        // If signUp is currently creating it, skip — signUp will call fetchProfile when done.
        if (signUpInProgressRef.current) {
          return;
        }
        // Create it from auth metadata
        const { data: { user } } = await supabase.auth.getUser();
        const username = user?.user_metadata?.username || 'player_' + userId.slice(0, 8);
        const lang = user?.user_metadata?.language || 'en';
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId, username, language: lang, timezone }, { onConflict: 'id' })
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
        console.error('Failed to fetch profile:', error.code ?? 'unknown');
      }
      setProfile(data);
      if (data?.language) {
        setLanguage(data.language);
        i18n.changeLanguage(data.language);
      }
      // Sync timezone in the background on every profile fetch (handles travel/relocation)
      if (data) {
        syncTimezone(userId, data.timezone);
      }
    } catch {
      console.error('Profile fetch error');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id);
    }
  }

  async function signUp(email: string, password: string, username: string, lang?: string) {
    if (!rateLimits.signUp()) {
      return { error: new Error('Too many attempts. Please wait a moment.') };
    }
    signUpInProgressRef.current = true;
    try {
      const userLang = lang || language;
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
              timezone: userTimezone,
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
        // Poll for the profile (trigger may take a moment to complete)
        // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
        let existingProfile = null;
        for (let attempt = 0; attempt < PROFILE_POLL_MAX_RETRIES; attempt++) {
          const { data: profile, error: pollError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', data.user.id)
            .maybeSingle();
          if (pollError) {
            // Query failed — continue polling
          } else if (profile) {
            existingProfile = profile;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, PROFILE_POLL_BASE_MS * Math.pow(2, attempt)));
        }

        if (!existingProfile) {
          // Trigger didn't create the profile — create it manually (upsert to avoid race with onAuthStateChange)
          await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username,
              language: userLang,
              timezone: userTimezone,
            }, { onConflict: 'id' });
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
    } finally {
      signUpInProgressRef.current = false;
    }
  }

  async function signIn(email: string, password: string) {
    if (!rateLimits.signIn()) {
      return { error: new Error('Too many login attempts. Please wait a moment.') };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) resetRateLimit('signIn');
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

  async function resetPassword(email: string) {
    if (!rateLimits.resetPassword()) {
      return { error: new Error('Too many attempts. Please wait a moment.') };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'oneword://reset-password',
    });
    return { error };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordRecovery(false);
    }
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, language, pendingVerification, passwordRecovery, signUp, signIn, signOut, refreshProfile, updateAvatar, updateLanguage, deleteAccount, resendVerification, clearPendingVerification, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an <AuthProvider>');
  }
  return context;
}
