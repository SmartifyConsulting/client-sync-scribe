import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'doctor' | 'patient' | 'admin' | 'emergency' | null;
type ResolvedRole = Exclude<UserRole, null>;
type RawRole = 'doctor' | 'patient' | 'admin' | 'hospital_staff' | 'ambulance_staff' | 'blood_bank';
const EMERGENCY_RAW: RawRole[] = ['hospital_staff', 'ambulance_staff', 'blood_bank'];

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<ResolvedRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setAvailableRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [
          { data: profileData, error: profileError },
          { data: roleRows, error: rolesError },
          { data: hospOwned },
          { data: ambOwned },
          { data: insOwned },
          { data: pharmOwned },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id),
          supabase.from('holarchelp_hospitals' as any).select('id').eq('owner_id', user.id).maybeSingle(),
          supabase.from('holarchelp_ambulance_providers' as any).select('id').eq('owner_id', user.id).maybeSingle(),
          supabase.from('holarchelp_insurance_providers' as any).select('id').eq('owner_id', user.id).maybeSingle(),
          supabase.from('holarchelp_pharmacies' as any).select('id').eq('owner_id', user.id).maybeSingle(),
        ]);

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile role:', profileError);
        }

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        }

        const rawRoles = (roleRows ?? []).map((row) => row.role as RawRole);
        const hasEmergencyRaw = rawRoles.some((r) => EMERGENCY_RAW.includes(r));
        const ownsProvider = Boolean(
          (hospOwned as any)?.id || (ambOwned as any)?.id || (insOwned as any)?.id || (pharmOwned as any)?.id
        );

        const normalized: ResolvedRole[] = [];
        const profileRole = profileData?.role as ResolvedRole | undefined;
        if (profileRole) normalized.push(profileRole);
        for (const r of rawRoles) {
          if (r === 'doctor' || r === 'patient' || r === 'admin') {
            if (!normalized.includes(r)) normalized.push(r);
          }
        }
        if ((hasEmergencyRaw || ownsProvider) && !normalized.includes('emergency')) normalized.push('emergency');

        // If the user owns a provider organisation, the provider portal takes
        // precedence over any auto-assigned doctor profile.
        const effectiveRole: UserRole = ownsProvider
          ? 'emergency'
          : profileRole ??
            (normalized.includes('doctor')
              ? 'doctor'
              : normalized.includes('patient')
                ? 'patient'
                : normalized.includes('emergency')
                  ? 'emergency'
                  : normalized.includes('admin')
                    ? 'admin'
                    : null);

        setAvailableRoles(normalized);
        setRole(effectiveRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setAvailableRoles([]);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isDoctor: role === 'doctor',
    isPatient: role === 'patient',
    isEmergency: role === 'emergency',
    isAdmin: availableRoles.includes('admin'),
    hasDoctorRole: availableRoles.includes('doctor'),
    hasPatientRole: availableRoles.includes('patient'),
    hasEmergencyRole: availableRoles.includes('emergency'),
    hasAdminRole: availableRoles.includes('admin'),
  };
}
