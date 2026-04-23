import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns';

export interface PatientReward {
  id: string;
  patient_id: string;
  session_id: string | null;
  reward_type: string;
  visit_category: string;
  lollipops_count: number;
  awarded_by: string;
  awarded_at: string;
  created_at: string;
}

export interface GamificationConfig {
  id: string;
  visit_category: string;
  lollipops_awarded: number;
  description: string | null;
  is_active: boolean;
}

export interface StreakConfig {
  id: string;
  streak_name: string;
  visit_category: string;
  streak_interval_months: number;
  lollipops_awarded: number;
  description: string | null;
  is_active: boolean;
}

export interface PatientStreak {
  id: string;
  patient_id: string;
  streak_config_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_at: string | null;
  next_due_at: string | null;
  // Joined fields
  streak_name?: string;
  visit_category?: string;
  lollipops_awarded?: number;
  description?: string | null;
}

export function usePatientRewards(patientId?: string) {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<PatientReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [lollipopCount, setLollipopCount] = useState(0);
  const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig[]>([]);

  const fetchGamificationConfig = async () => {
    const { data, error } = await supabase
      .from('gamification_config')
      .select('*')
      .eq('is_active', true)
      .order('visit_category');

    if (!error && data) {
      setGamificationConfig(data);
    }
    return data || [];
  };

  const fetchRewards = async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_rewards')
        .select('*')
        .eq('patient_id', patientId)
        .eq('reward_type', 'lollipop')
        .order('awarded_at', { ascending: false });

      if (error) throw error;

      setRewards(data || []);
      const totalLollipops = (data || []).reduce((sum, r) => sum + (r.lollipops_count || 1), 0);
      setLollipopCount(totalLollipops);
    } catch (error: any) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLollipopsForCategory = (category: string): number => {
    const config = gamificationConfig.find(
      c => c.visit_category.toLowerCase() === category.toLowerCase()
    );
    return config?.lollipops_awarded || 1;
  };

  const updateStreak = async (
    patientId: string,
    visitCategory: string,
    patientUserId?: string | null
  ) => {
    try {
      // Find matching streak config
      const { data: streakConfigs } = await supabase
        .from('streak_config')
        .select('*')
        .eq('visit_category', visitCategory)
        .eq('is_active', true);

      if (!streakConfigs || streakConfigs.length === 0) return;

      for (const config of streakConfigs) {
        // Get or create patient streak
        const { data: existingStreak } = await supabase
          .from('patient_streaks')
          .select('*')
          .eq('patient_id', patientId)
          .eq('streak_config_id', config.id)
          .maybeSingle();

        const now = new Date();
        const nextDue = addMonths(now, config.streak_interval_months);

        if (existingStreak) {
          // Check if within streak window
          const isWithinWindow = existingStreak.next_due_at 
            ? new Date(existingStreak.next_due_at) >= now 
            : true;

          const newStreak = isWithinWindow ? existingStreak.current_streak + 1 : 1;
          const longestStreak = Math.max(newStreak, existingStreak.longest_streak);

          await supabase
            .from('patient_streaks')
            .update({
              current_streak: newStreak,
              longest_streak: longestStreak,
              last_completed_at: now.toISOString(),
              next_due_at: nextDue.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', existingStreak.id);

          // Award streak bonus if maintaining streak
          if (newStreak > 1 && patientUserId) {
            await supabase.from('notifications').insert({
              user_id: patientUserId,
              title: `🔥 ${newStreak} visit streak for ${config.streak_name}!`,
              description: `Keep it up! You've maintained your ${config.streak_name} streak for ${newStreak} consecutive visits.`,
              type: 'streak',
            });
          }
        } else {
          // Create new streak
          await supabase
            .from('patient_streaks')
            .insert({
              patient_id: patientId,
              streak_config_id: config.id,
              current_streak: 1,
              longest_streak: 1,
              last_completed_at: now.toISOString(),
              next_due_at: nextDue.toISOString(),
            });

          if (patientUserId) {
            await supabase.from('notifications').insert({
              user_id: patientUserId,
              title: `🔥 Started ${config.streak_name} streak!`,
              description: `Great start! Complete your next ${config.visit_category} within ${config.streak_interval_months} months to maintain your streak.`,
              type: 'streak',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const awardLollipop = async (
    patientId: string,
    sessionId: string | null,
    visitCategory: string,
    awardedBy: string,
    patientUserId?: string | null
  ): Promise<boolean> => {
    try {
      // Get lollipop count from config
      const config = await fetchGamificationConfig();
      const categoryConfig = config.find(
        c => c.visit_category.toLowerCase() === visitCategory.toLowerCase()
      );
      const lollipopsToAward = categoryConfig?.lollipops_awarded || 1;

      const { data, error } = await supabase
        .from('patient_rewards')
        .insert({
          patient_id: patientId,
          session_id: sessionId,
          reward_type: 'lollipop',
          visit_category: visitCategory,
          lollipops_count: lollipopsToAward,
          awarded_by: awardedBy,
        })
        .select()
        .single();

      if (error) throw error;

      setRewards((prev) => [data, ...prev]);
      setLollipopCount((prev) => prev + lollipopsToAward);

      // Update streaks for this visit category
      await updateStreak(patientId, visitCategory, patientUserId);

      // Create notification for the patient if they have a user account
      if (patientUserId) {
        await supabase.from('notifications').insert({
          user_id: patientUserId,
          title: `Ⓜ You earned ${lollipopsToAward} Vula${lollipopsToAward > 1 ? 's' : ''}!`,
          description: `Great job! You received ${lollipopsToAward} Vula${lollipopsToAward > 1 ? 's' : ''} for your ${visitCategory}.`,
          type: 'reward',
          reference_id: data.id,
        });
      }

      toast({
        title: `Ⓜ ${lollipopsToAward} Vula${lollipopsToAward > 1 ? 's' : ''} Awarded!`,
        description: `Patient earned ${lollipopsToAward} Vula${lollipopsToAward > 1 ? 's' : ''} for their ${visitCategory}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error awarding lollipop:', error);
      return false;
    }
  };

  // Award signup bonus lollipop
  const awardSignupBonus = async (
    patientId: string,
    patientUserId: string
  ): Promise<boolean> => {
    try {
      // Check if already awarded
      const { data: existing } = await supabase
        .from('patient_rewards')
        .select('id')
        .eq('patient_id', patientId)
        .eq('visit_category', 'Signup Bonus')
        .maybeSingle();

      if (existing) {
        console.log('Signup bonus already awarded');
        return false;
      }

      // Get signup bonus config
      const config = await fetchGamificationConfig();
      const signupConfig = config.find(c => c.visit_category === 'Signup Bonus');
      const lollipopsToAward = signupConfig?.lollipops_awarded || 1;

      const { data, error } = await supabase
        .from('patient_rewards')
        .insert({
          patient_id: patientId,
          session_id: null,
          reward_type: 'lollipop',
          visit_category: 'Signup Bonus',
          lollipops_count: lollipopsToAward,
          awarded_by: patientUserId, // Self-awarded on signup
        })
        .select()
        .single();

      if (error) throw error;

      // Create welcome notification
      await supabase.from('notifications').insert({
        user_id: patientUserId,
        title: 'Ⓜ Welcome! You earned your first Vula!',
        description: `Congratulations on signing up! You received ${lollipopsToAward} Vula${lollipopsToAward > 1 ? 's' : ''} as a welcome bonus.`,
        type: 'reward',
        reference_id: data.id,
      });

      return true;
    } catch (error: any) {
      console.error('Error awarding signup bonus:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchGamificationConfig();
  }, [patientId]);

  return {
    rewards,
    lollipopCount,
    loading,
    gamificationConfig,
    fetchRewards,
    awardLollipop,
    awardSignupBonus,
    getLollipopsForCategory,
    fetchGamificationConfig,
  };
}

// Hook for patients to view their own rewards
export function useMyRewards() {
  const [rewards, setRewards] = useState<PatientReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [lollipopCount, setLollipopCount] = useState(0);

  useEffect(() => {
    const fetchMyRewards = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find patient record linked to this user
        const { data: patientData } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_user_id', user.id)
          .maybeSingle();

        if (!patientData) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('patient_rewards')
          .select('*')
          .eq('patient_id', patientData.id)
          .eq('reward_type', 'lollipop')
          .order('awarded_at', { ascending: false });

        if (error) throw error;

        setRewards(data || []);
        const totalLollipops = (data || []).reduce((sum, r) => sum + (r.lollipops_count || 1), 0);
        setLollipopCount(totalLollipops);
      } catch (error: any) {
        console.error('Error fetching my rewards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRewards();
  }, []);

  return { rewards, lollipopCount, loading };
}

// Picks the patient record with the most active prescriptions for the
// signed-in user. Falls back to chronic, then newest. Excludes archived rows.
export function useMyChronicPatientId() {
  return useQuery({
    queryKey: ['my-chronic-patient-record'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_chronic, created_at, status')
        .eq('patient_user_id', user.id)
        .neq('status', 'archived');

      if (!patients?.length) return null;

      const ids = patients.map((p) => p.id);
      const { data: rxRows } = await supabase
        .from('prescriptions')
        .select('patient_id')
        .in('patient_id', ids)
        .eq('status', 'active');

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: adhRows } = await supabase
        .from('medication_adherence')
        .select('patient_id, taken_at')
        .in('patient_id', ids)
        .gte('scheduled_date', today)
        .order('taken_at', { ascending: false });

      const rxCount = new Map<string, number>();
      (rxRows ?? []).forEach((r) => rxCount.set(r.patient_id, (rxCount.get(r.patient_id) ?? 0) + 1));

      const lastAdh = new Map<string, number>();
      (adhRows ?? []).forEach((r) => {
        if (r.taken_at && !lastAdh.has(r.patient_id)) {
          lastAdh.set(r.patient_id, new Date(r.taken_at).getTime());
        }
      });

      const ranked = [...patients].sort((a, b) => {
        const rx = (rxCount.get(b.id) ?? 0) - (rxCount.get(a.id) ?? 0);
        if (rx !== 0) return rx;
        const adh = (lastAdh.get(b.id) ?? 0) - (lastAdh.get(a.id) ?? 0);
        if (adh !== 0) return adh;
        const chronic = Number(!!b.is_chronic) - Number(!!a.is_chronic);
        if (chronic !== 0) return chronic;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const chosen = ranked[0];
      if (import.meta.env.DEV) {
        const reason = (rxCount.get(chosen.id) ?? 0) > 0
          ? `most active prescriptions (${rxCount.get(chosen.id)})`
          : chosen.is_chronic ? 'is_chronic flag' : 'newest record';
        // eslint-disable-next-line no-console
        console.log('[useMyChronicPatientId] picked', chosen.id, '·', reason);
      }
      return chosen;
    },
  });
}

// Hook for patients to view their streaks
export function useMyStreaks() {
  const [streaks, setStreaks] = useState<PatientStreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyStreaks = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find patient record linked to this user
        const { data: patientData } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_user_id', user.id)
          .maybeSingle();

        if (!patientData) {
          setLoading(false);
          return;
        }

        // Get all streak configs
        const { data: configs } = await supabase
          .from('streak_config')
          .select('*')
          .eq('is_active', true);

        if (!configs) {
          setLoading(false);
          return;
        }

        // Get patient's streaks
        const { data: patientStreaks } = await supabase
          .from('patient_streaks')
          .select('*')
          .eq('patient_id', patientData.id);

        // Merge configs with patient data
        const mergedStreaks: PatientStreak[] = configs.map(config => {
          const existing = patientStreaks?.find(s => s.streak_config_id === config.id);
          return {
            id: existing?.id || config.id,
            patient_id: patientData.id,
            streak_config_id: config.id,
            current_streak: existing?.current_streak || 0,
            longest_streak: existing?.longest_streak || 0,
            last_completed_at: existing?.last_completed_at || null,
            next_due_at: existing?.next_due_at || null,
            streak_name: config.streak_name,
            visit_category: config.visit_category,
            lollipops_awarded: config.lollipops_awarded,
            description: config.description,
          };
        });

        setStreaks(mergedStreaks);
      } catch (error: any) {
        console.error('Error fetching my streaks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyStreaks();
  }, []);

  return { streaks, loading };
}

// Hook for gamification admin
export function useGamificationAdmin() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<GamificationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gamification_config')
        .select('*')
        .order('visit_category');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Error fetching gamification config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (id: string, updates: Partial<GamificationConfig>) => {
    try {
      const { error } = await supabase
        .from('gamification_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast({ title: 'Updated', description: 'Gamification config updated successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update config', variant: 'destructive' });
      return false;
    }
  };

  const createConfig = async (config: Omit<GamificationConfig, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('gamification_config')
        .insert(config)
        .select()
        .single();

      if (error) throw error;

      setConfigs(prev => [...prev, data]);
      toast({ title: 'Created', description: 'New reward category added' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to create config', variant: 'destructive' });
      return null;
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gamification_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Deleted', description: 'Reward category removed' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete config', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    fetchConfigs,
    updateConfig,
    createConfig,
    deleteConfig,
  };
}

// Hook for streak admin
export function useStreakAdmin() {
  const { toast } = useToast();
  const [streakConfigs, setStreakConfigs] = useState<StreakConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreakConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('streak_config')
        .select('*')
        .order('streak_name');

      if (error) throw error;
      setStreakConfigs(data || []);
    } catch (error: any) {
      console.error('Error fetching streak config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreakConfig = async (id: string, updates: Partial<StreakConfig>) => {
    try {
      const { error } = await supabase
        .from('streak_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setStreakConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast({ title: 'Updated', description: 'Streak config updated successfully' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update streak config', variant: 'destructive' });
      return false;
    }
  };

  const createStreakConfig = async (config: Omit<StreakConfig, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('streak_config')
        .insert(config)
        .select()
        .single();

      if (error) throw error;

      setStreakConfigs(prev => [...prev, data]);
      toast({ title: 'Created', description: 'New streak category added' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to create streak config', variant: 'destructive' });
      return null;
    }
  };

  const deleteStreakConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('streak_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStreakConfigs(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Deleted', description: 'Streak category removed' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete streak config', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchStreakConfigs();
  }, []);

  return {
    streakConfigs,
    loading,
    fetchStreakConfigs,
    updateStreakConfig,
    createStreakConfig,
    deleteStreakConfig,
  };
}
