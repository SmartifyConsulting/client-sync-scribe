import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'doctor' | 'patient' | 'admin' | null;
type ResolvedRole = Exclude<UserRole, null>;

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

        const roles = Array.from(
          new Set(
            [
              profileData?.role,
              ...((roleRows ?? []).map((row) => row.role)),
            ].filter(Boolean)
          )
        ) as ResolvedRole[];

        const effectiveRole: UserRole =
          (profileData?.role as UserRole) ??
          (roles.includes('doctor')
            ? 'doctor'
            : roles.includes('patient')
              ? 'patient'
              : roles.includes('admin')
                ? 'admin'
                : null);

        setAvailableRoles(roles);
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
    isAdmin: availableRoles.includes('admin'),
    hasDoctorRole: availableRoles.includes('doctor'),
    hasPatientRole: availableRoles.includes('patient'),
    hasAdminRole: availableRoles.includes('admin'),
  };
}
