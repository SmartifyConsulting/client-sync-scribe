import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  full_name: string | null;
  practice_number: string | null;
  doctor_number: string | null;
  practice_address: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  signature_url: string | null;
  role: 'doctor' | 'patient' | null;
  specialty: string | null;
  mobile_number: string | null;
  inactive_threshold_months: number | null;
  signature_font: string | null;
  signature_color: string | null;
  preferred_language: string | null;
  auto_email_invoice_to_insurance: boolean | null;
  auto_email_prescription_to_pharmacy: boolean | null;
  auto_email_certificate_to_employer: boolean | null;
  narration_voice: string | null;
  chronic_med_notification_frequency: string | null;
  practice_color: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_swift_code: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Profile might not exist yet for existing users
      if (error.code === 'PGRST116') {
        // Create profile for existing user
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id })
          .select()
          .single();
        
        if (!insertError && newProfile) {
          setProfile(newProfile as unknown as Profile);
        }
      }
    } else {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as unknown as Profile);
    }

    return { data, error };
  };

  const uploadLogo = async (file: File): Promise<{ url: string | null; error: Error | null }> => {
    if (!user) return { url: null, error: new Error('Not authenticated') };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    // Update profile with logo URL (cache-busted)
    await updateProfile({ logo_url: `${data.publicUrl}?t=${Date.now()}` });

    return { url: data.publicUrl, error: null };
  };

  return { profile, loading, fetchProfile, updateProfile, uploadLogo };
}
