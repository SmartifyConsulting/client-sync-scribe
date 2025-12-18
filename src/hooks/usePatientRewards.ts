import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      // Sum up all lollipops_count
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

      // Create notification for the patient if they have a user account
      if (patientUserId) {
        await supabase.from('notifications').insert({
          user_id: patientUserId,
          title: `🍭 You earned ${lollipopsToAward} lollipop${lollipopsToAward > 1 ? 's' : ''}!`,
          description: `Great job! You received ${lollipopsToAward} lollipop${lollipopsToAward > 1 ? 's' : ''} for your ${visitCategory}.`,
          type: 'reward',
          reference_id: data.id,
        });
      }

      toast({
        title: `🍭 ${lollipopsToAward} Lollipop${lollipopsToAward > 1 ? 's' : ''} Awarded!`,
        description: `Patient earned ${lollipopsToAward} lollipop${lollipopsToAward > 1 ? 's' : ''} for their ${visitCategory}`,
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
        title: '🍭 Welcome! You earned your first lollipop!',
        description: `Congratulations on signing up! You received ${lollipopsToAward} lollipop${lollipopsToAward > 1 ? 's' : ''} as a welcome bonus.`,
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
