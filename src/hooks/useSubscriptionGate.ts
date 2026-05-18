import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSubscriptionGate() {
  const { user, loading: authLoading } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // MVP: subscription gate disabled — never block, never surface a trial countdown.
    setIsBlocked(false);
    setDaysRemaining(null);
    setLoading(false);
    return;
    // eslint-disable-next-line no-unreachable
    if (authLoading) return;
    if (!user) {
      setIsBlocked(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!subs || subs.length === 0) {
        // No subscription record at all — don't block (they might be legacy)
        setIsBlocked(false);
        setDaysRemaining(null);
        setLoading(false);
        return;
      }

      // Check if user has any active paid subscription
      const hasActivePaid = subs.some(
        (s) => s.status === 'active' && !s.is_trial
      );

      if (hasActivePaid) {
        setIsBlocked(false);
        setDaysRemaining(null);
        setLoading(false);
        return;
      }

      // Check free period
      const freePeriodSub = subs.find((s) => s.status === 'free_period');
      if (freePeriodSub && freePeriodSub.trial_ends_at) {
        const endsAt = new Date(freePeriodSub.trial_ends_at);
        const now = new Date();
        const diffMs = endsAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          setIsBlocked(true);
          setDaysRemaining(0);
        } else {
          setIsBlocked(false);
          setDaysRemaining(diffDays);
        }
      } else {
        // Has subscription but not free_period and not active paid — could be cancelled, etc.
        // Check trial_pending legacy
        const trialSub = subs.find((s) => s.status === 'trial_pending' || s.status === 'trial_active');
        if (trialSub && trialSub.trial_ends_at) {
          const endsAt = new Date(trialSub.trial_ends_at);
          const now = new Date();
          const diffMs = endsAt.getTime() - now.getTime();
          if (diffMs <= 0) {
            setIsBlocked(true);
            setDaysRemaining(0);
          } else {
            setIsBlocked(false);
            setDaysRemaining(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
        } else {
          setIsBlocked(false);
          setDaysRemaining(null);
        }
      }

      setLoading(false);
    };

    check();
  }, [user, authLoading]);

  return { isBlocked, daysRemaining, loading };
}
