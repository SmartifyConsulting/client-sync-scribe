import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { startLoginTracking, endLoginTracking } from '@/lib/loginTracking';

const SIGNIN_COUNT_PREFIX = 'holarc.signinCount.';
const LAST_TOKEN_PREFIX = 'holarc.lastTokenSeen.';
const SESSION_RESTORE_RETRY_MS = 350;
const SESSION_RESTORE_RETRIES = 2;

let manualSignOutRequested = false;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasStoredAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch {
    // If storage is temporarily unavailable, avoid an eager signed-out redirect.
    return true;
  }
  return false;
}

async function getSessionWithRetry(): Promise<Session | null> {
  const attempts = hasStoredAuthSession() ? SESSION_RESTORE_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    if (attempt < attempts - 1) await wait(SESSION_RESTORE_RETRY_MS);
  }

  return null;
}

function bumpSigninCount(session: Session | null) {
  try {
    if (!session?.user || typeof window === 'undefined') return;
    const userId = session.user.id;
    const tokenSig = (session.access_token || '').slice(-12);
    const tokenKey = LAST_TOKEN_PREFIX + userId;
    if (!tokenSig) return;
    if (localStorage.getItem(tokenKey) === tokenSig) return;
    localStorage.setItem(tokenKey, tokenSig);
    const countKey = SIGNIN_COUNT_PREFIX + userId;
    const n = Number(localStorage.getItem(countKey) || '0') + 1;
    localStorage.setItem(countKey, String(n));
  } catch {
    // ignore storage errors
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session, allowing preview/HMR storage hydration to settle first.
    getSessionWithRetry().then((session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) void startLoginTracking(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          bumpSigninCount(session);
          void startLoginTracking(session);
        }

        if (event === 'SIGNED_OUT' && !manualSignOutRequested) {
          setLoading(true);
          getSessionWithRetry().then((restoredSession) => {
            if (!mounted) return;
            setSession(restoredSession);
            setUser(restoredSession?.user ?? null);
            setLoading(false);
          });
          return;
        }

        if (event === 'SIGNED_OUT') {
          manualSignOutRequested = false;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string; role?: string },
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: metadata,
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    manualSignOutRequested = true;
    await endLoginTracking().catch(() => undefined);
    const { error } = await supabase.auth.signOut();
    if (error) manualSignOutRequested = false;
    return { error };
  };

  const signInWithOtp = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { data, error };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { data, error };
  };

  return { user, session, loading, signUp, signIn, signOut, signInWithOtp, verifyOtp };
}

/** True only while the current user is still in their very first sign-in session. */
export function isFirstSigninSession(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    const n = Number(localStorage.getItem(SIGNIN_COUNT_PREFIX + userId) || '0');
    return n > 0 && n <= 1;
  } catch {
    return false;
  }
}
