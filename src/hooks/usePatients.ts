import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface Surgery {
  id: string;
  name: string;
  date: string;
  notes?: string;
  date_precision?: 'exact' | 'month' | 'year';
}

export interface Pharmacy {
  id: string;
  name: string;
  email: string;
  branch?: string;
  is_primary: boolean;
}

export interface FamilyHistoryEntry {
  id: string;
  relation: string;
  condition: string;
}

export interface NextOfKinMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  shared?: boolean;
  notified_at?: string;
  can_view_profile?: boolean;
  can_view_live_tracking?: boolean;
}

export interface CurrentMedication {
  id: string;
  name: string;
  dosage?: string;
  /** Tablets/units per dose (e.g. "1", "2"). */
  quantity?: string;
  /** Strength value (e.g. "500"). */
  strength?: string;
  /** Strength units — defaults to "mg". */
  units?: string;
  /** Repeats/day, integer-as-string. */
  times_per_day?: string;
  is_chronic: boolean;
  status?: 'current' | 'past';
  start_date?: string;
  end_date?: string;
  reminder_time?: string;
  reminders_enabled?: boolean;
}

export interface ConditionDiagnosis {
  id: string;
  name: string;
  diagnosed_date?: string;
  diagnosed_by?: string;
  status: 'active' | 'resolved';
}

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  physical_address: string | null;
  postal_address: string | null;
  same_as_physical: boolean | null;
  referred_by: string | null;
  employer: string | null;
  occupation: string | null;
  medical_aid: string | null;
  medical_aid_number: string | null;
  primary_member: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_email: string | null;
  next_of_kin_relationship: string | null;
  general_practitioner: string | null;
  allergies: string | null;
  claims_email: string | null;
  medical_insurance_product: string | null;
  marital_status: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  surgeries: Surgery[] | null;
  id_passport_number: string | null;
  gender: string | null;
  pharmacy_name: string | null;
  pharmacy_email: string | null;
  pharmacies: Pharmacy[] | null;
  is_chronic: boolean | null;
  reporting_to_email: string | null;
  blood_type: string | null;
  family_history: FamilyHistoryEntry[] | null;
  organ_donor: boolean | null;
  organ_donor_organs: string[] | null;
  next_of_kin_members: NextOfKinMember[] | null;
  current_medications: CurrentMedication[] | null;
  conditions_diagnoses?: ConditionDiagnosis[] | null;
  last_visit?: string | null;
  patient_user_id?: string | null;
}

// Helper to parse surgeries from JSON
const parseSurgeries = (surgeries: Json | null): Surgery[] | null => {
  if (!surgeries) return null;
  if (Array.isArray(surgeries)) {
    return surgeries as unknown as Surgery[];
  }
  return null;
};

// Helper to parse pharmacies from JSON
const parsePharmacies = (pharmacies: Json | null): Pharmacy[] | null => {
  if (!pharmacies) return null;
  if (Array.isArray(pharmacies)) {
    return pharmacies as unknown as Pharmacy[];
  }
  return null;
};

// Helper to parse family history from JSON
const parseFamilyHistory = (fh: Json | null): FamilyHistoryEntry[] | null => {
  if (!fh) return null;
  if (Array.isArray(fh)) return fh as unknown as FamilyHistoryEntry[];
  return null;
};

const parseNOKMembers = (data: Json | null): NextOfKinMember[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) return data as unknown as NextOfKinMember[];
  return null;
};

const parseCurrentMedications = (data: Json | null): CurrentMedication[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) return data as unknown as CurrentMedication[];
  return null;
};

const parseConditionsDiagnoses = (data: Json | null): ConditionDiagnosis[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) return data as unknown as ConditionDiagnosis[];
  return null;
};

// Helper to convert patient from DB to typed Patient
const toPatient = (data: any, lastVisit?: string | null): Patient => ({
  ...data,
  surgeries: parseSurgeries(data.surgeries),
  pharmacies: parsePharmacies(data.pharmacies),
  family_history: parseFamilyHistory(data.family_history),
  next_of_kin_members: parseNOKMembers(data.next_of_kin_members),
  current_medications: parseCurrentMedications(data.current_medications),
  conditions_diagnoses: parseConditionsDiagnoses(data.conditions_diagnoses),
  last_visit: lastVisit ?? data.last_visit ?? null,
});

// Helper to prepare patient data for DB (convert surgeries/pharmacies to JSON)
const toDbPatient = (updates: Partial<Patient>): Record<string, any> => {
  const { surgeries, pharmacies, family_history, organ_donor_organs, last_visit, next_of_kin_members, current_medications, conditions_diagnoses, ...rest } = updates as any;
  return {
    ...rest,
    ...(surgeries !== undefined ? { surgeries: surgeries as unknown as Json } : {}),
    ...(pharmacies !== undefined ? { pharmacies: pharmacies as unknown as Json } : {}),
    ...(family_history !== undefined ? { family_history: family_history as unknown as Json } : {}),
    ...(organ_donor_organs !== undefined ? { organ_donor_organs: organ_donor_organs as unknown as Json } : {}),
    ...(next_of_kin_members !== undefined ? { next_of_kin_members: next_of_kin_members as unknown as Json } : {}),
    ...(current_medications !== undefined ? { current_medications: current_medications as unknown as Json } : {}),
    ...(conditions_diagnoses !== undefined ? { conditions_diagnoses: conditions_diagnoses as unknown as Json } : {}),
  };
};

// Helper to determine if patient should be inactive based on last visit and threshold
const shouldBeInactive = (lastVisit: string | null, thresholdMonths: number): boolean => {
  if (!lastVisit) return false;
  const lastVisitDate = new Date(lastVisit);
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);
  return lastVisitDate < thresholdDate;
};

export function usePatients() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      let inactiveThresholdMonths = 12;
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('inactive_threshold_months')
          .eq('id', user.id)
          .single();
        
        if (profileData?.inactive_threshold_months) {
          inactiveThresholdMonths = profileData.inactive_threshold_months;
        }
      }
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const patientsWithLastVisit = await Promise.all(
        (data || []).map(async (patient) => {
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('started_at')
            .eq('patient_id', patient.id)
            .eq('status', 'completed')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const lastVisit = sessionData?.started_at || null;
          const typedPatient = toPatient(patient, lastVisit);
          
          const shouldSetInactive = shouldBeInactive(lastVisit, inactiveThresholdMonths);
          if (shouldSetInactive && typedPatient.status === 'active') {
            await supabase
              .from('patients')
              .update({ status: 'inactive' })
              .eq('id', patient.id);
            typedPatient.status = 'inactive';
          } else if (!shouldSetInactive && lastVisit && typedPatient.status === 'inactive') {
            await supabase
              .from('patients')
              .update({ status: 'active' })
              .eq('id', patient.id);
            typedPatient.status = 'active';
          }
          
          return typedPatient;
        })
      );

      patientsWithLastVisit.sort((a, b) => {
        const aLast = a.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
        const bLast = b.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
        if (aLast !== bLast) return aLast.localeCompare(bLast);
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      setPatients(patientsWithLastVisit);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load patients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createPatient = async (patient: Omit<Patient, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dbPatient = toDbPatient(patient as Partial<Patient>);

      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: patient.name,
          ...dbPatient,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      const typedPatient = toPatient(data);
      setPatients((prev) => [typedPatient, ...prev]);
      toast({ title: 'Success', description: 'Patient added successfully' });
      return typedPatient;
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add patient',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const dbUpdates = toDbPatient(updates);

      const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const typedPatient = toPatient(data);
      setPatients((prev) => prev.map((p) => (p.id === id ? typedPatient : p)));
      toast({ title: 'Success', description: 'Patient updated successfully' });
      return typedPatient;
    } catch (error: any) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to update patient',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);

      if (error) throw error;
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Success', description: 'Patient deleted successfully' });
      return true;
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete patient',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients,
    loading,
    fetchPatients,
    createPatient,
    updatePatient,
    deletePatient,
  };
}

export function usePatient(id: string) {
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      let resolved = data;

      // Duplicate-record resolution: if this row is linked to an auth user,
      // prefer the most recent non-archived sibling so clinical data (e.g.
      // hospital admissions) attached to any of the duplicates surfaces.
      if (resolved?.patient_user_id) {
        const { data: siblings } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_user_id', resolved.patient_user_id)
          .order('updated_at', { ascending: false });
        if (siblings && siblings.length > 1) {
          const preferred =
            siblings.find((s) => !/\(archived\)/i.test(s.name || '')) || siblings[0];
          if (preferred) resolved = preferred;
        }
      }

      if (resolved) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('started_at')
          .eq('patient_id', resolved.id)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setPatient(toPatient(resolved, sessionData?.started_at || null));
      } else {
        setPatient(null);
      }
    } catch (error: any) {
      console.error('Error fetching patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to load patient',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePatient = async (updates: Partial<Patient>) => {
    try {
      const dbUpdates = toDbPatient(updates);

      const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const typedPatient = toPatient(data);
      setPatient(typedPatient);
      toast({ title: 'Success', description: 'Patient updated successfully' });
      return typedPatient;
    } catch (error: any) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to update patient',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    if (id) fetchPatient();
  }, [id]);

  return { patient, loading, updatePatient, refetch: fetchPatient };
}
