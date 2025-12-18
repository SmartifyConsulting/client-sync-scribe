import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientReward {
  id: string;
  patient_id: string;
  session_id: string | null;
  reward_type: string;
  visit_category: string;
  awarded_by: string;
  awarded_at: string;
  created_at: string;
}

// Visit categories that qualify for lollipop rewards
export const QUALIFYING_VISIT_CATEGORIES = [
  'GP Visit',
  'General Consultation',
  'Optometrist',
  'Eye Exam',
  'Vital Signs Check',
  'Blood Pressure Check',
  'Cholesterol Test',
  'Blood Sugar Test',
  'Diabetes Screening',
  'HIV Test',
  'STI Screening',
  'Pap Smear',
  'Cervical Screening',
  'Mammogram',
  'Breast Exam',
  'Prostate Exam',
  'Colonoscopy',
  'Vaccination',
  'Immunization',
  'Health Screening',
  'Preventative Care',
  'Annual Physical',
  'Wellness Check',
] as const;

export function usePatientRewards(patientId?: string) {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<PatientReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [lollipopCount, setLollipopCount] = useState(0);

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
      setLollipopCount((data || []).length);
    } catch (error: any) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const awardLollipop = async (
    patientId: string,
    sessionId: string | null,
    visitCategory: string,
    awardedBy: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('patient_rewards')
        .insert({
          patient_id: patientId,
          session_id: sessionId,
          reward_type: 'lollipop',
          visit_category: visitCategory,
          awarded_by: awardedBy,
        })
        .select()
        .single();

      if (error) throw error;

      setRewards((prev) => [data, ...prev]);
      setLollipopCount((prev) => prev + 1);

      toast({
        title: '🍭 Lollipop Awarded!',
        description: `Patient earned a lollipop for their ${visitCategory}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error awarding lollipop:', error);
      return false;
    }
  };

  // Check if a visit category qualifies for a lollipop
  const isQualifyingVisit = (category: string): boolean => {
    const normalizedCategory = category.toLowerCase();
    return QUALIFYING_VISIT_CATEGORIES.some(
      (q) => normalizedCategory.includes(q.toLowerCase()) || q.toLowerCase().includes(normalizedCategory)
    );
  };

  useEffect(() => {
    fetchRewards();
  }, [patientId]);

  return {
    rewards,
    lollipopCount,
    loading,
    fetchRewards,
    awardLollipop,
    isQualifyingVisit,
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
        setLollipopCount((data || []).length);
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
