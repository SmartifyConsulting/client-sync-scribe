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
        const [{ data: profileData, error: profileError }, { data: roleRows, error: rolesError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id),
        ]);

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile role:', profileError);
        }

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        }

        const rawRoles = (roleRows ?? []).map((row) => row.role as RawRole);
        const hasEmergencyRaw = rawRoles.some((r) => EMERGENCY_RAW.includes(r));

        const normalized: ResolvedRole[] = [];
        const profileRole = profileData?.role as ResolvedRole | undefined;
        if (profileRole) normalized.push(profileRole);
        for (const r of rawRoles) {
          if (r === 'doctor' || r === 'patient' || r === 'admin') {
            if (!normalized.includes(r)) normalized.push(r);
          }
        }
        if (hasEmergencyRaw && !normalized.includes('emergency')) normalized.push('emergency');

        const effectiveRole: UserRole =
          profileRole ??
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
