import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

export interface Profile {
  id: string;
  full_name: string | null;
  practice_number: string | null;
  doctor_number: string | null;
  practice_address: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  signature_url: string | null;
  role: Database['public']['Tables']['profiles']['Row']['role'];
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
    let { data, error } = await supabase
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
          .insert({ id: user.id, full_name: user.user_metadata?.full_name || user.user_metadata?.name || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ") || null })
          .select()
          .single();
        
        if (!insertError && newProfile) {
          setProfile(newProfile as unknown as Profile);
        }
      }
    } else {
      // Belt-and-braces: if the signup trigger didn't pick up the auth
      // metadata full_name (older accounts, or an invite accepted before
      // that backfill existed), heal it here so the name/initials actually
      // show instead of falling back to "User".
      if (!data.full_name?.trim()) {
        const fallbackName = String(user.user_metadata?.full_name || user.user_metadata?.name || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ")).trim();
        if (fallbackName) {
          const { data: healed } = await supabase
            .from('profiles')
            .update({ full_name: fallbackName })
            .eq('id', user.id)
            .select()
            .maybeSingle();
          data = healed ?? { ...data, full_name: fallbackName };
        }
      }
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Upsert also repairs accounts whose signup profile was never created.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
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
