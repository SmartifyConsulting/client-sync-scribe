import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'doctor' | 'patient' | 'admin' | 'emergency' | null;
type ResolvedRole = Exclude<UserRole, null>;
type RawRole = 'doctor' | 'patient' | 'admin' | 'hospital_staff' | 'ambulance_staff' | 'blood_bank';
const EMERGENCY_RAW: RawRole[] = ['hospital_staff', 'ambulance_staff', 'blood_bank'];

// Module-level cache so navigating across layout groups (which remounts the
// sidebar) doesn't restart from role=null and briefly render the wrong nav.
const roleCache = new Map<string, { role: UserRole; availableRoles: ResolvedRole[] }>();

export function useUserRole() {
  const { user } = useAuth();
  const cached = user ? roleCache.get(user.id) : undefined;
  const [role, setRole] = useState<UserRole>(cached?.role ?? null);
  const [availableRoles, setAvailableRoles] = useState<ResolvedRole[]>(cached?.availableRoles ?? []);
  const [loading, setLoading] = useState(!cached);

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

        // Prefer the explicit profile role so a doctor who also owns a hospital
        // (or other provider) still lands on the doctor dashboard. The profile
        // switcher still surfaces the provider portal via hasEmergencyRole.
        const effectiveRole: UserRole =
          profileRole ??
          (normalized.includes('doctor')
            ? 'doctor'
            : normalized.includes('patient')
              ? 'patient'
              : (ownsProvider || normalized.includes('emergency'))
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
