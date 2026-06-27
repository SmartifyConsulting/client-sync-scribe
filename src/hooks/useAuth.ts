import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SIGNIN_COUNT_PREFIX = 'holarc.signinCount.';
const LAST_TOKEN_PREFIX = 'holarc.lastTokenSeen.';

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') bumpSigninCount(session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signOut();
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
