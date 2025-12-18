import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface Surgery {
  id: string;
  name: string;
  date: string;
  notes?: string;
}

export interface Patient {
  id: string;
  user_id: string;
  name: string;
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
  general_practitioner: string | null;
  allergies: string | null;
  claims_email: string | null;
  medical_insurance_product: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  surgeries: Surgery[] | null;
  last_visit?: string | null;
}

// Helper to parse surgeries from JSON
const parseSurgeries = (surgeries: Json | null): Surgery[] | null => {
  if (!surgeries) return null;
  if (Array.isArray(surgeries)) {
    return surgeries as unknown as Surgery[];
  }
  return null;
};

// Helper to convert patient from DB to typed Patient
const toPatient = (data: any, lastVisit?: string | null): Patient => ({
  ...data,
  surgeries: parseSurgeries(data.surgeries),
  last_visit: lastVisit ?? data.last_visit ?? null,
});

// Helper to prepare patient data for DB (convert surgeries to JSON)
const toDbPatient = (updates: Partial<Patient>): Record<string, any> => {
  const { surgeries, last_visit, ...rest } = updates;
  return {
    ...rest,
    ...(surgeries !== undefined ? { surgeries: surgeries as unknown as Json } : {}),
  };
};

export function usePatients() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch last visit for each patient
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
          
          return toPatient(patient, sessionData?.started_at || null);
        })
      );

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
      
      // Fetch last visit from sessions
      if (data) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('started_at')
          .eq('patient_id', id)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setPatient(toPatient(data, sessionData?.started_at || null));
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
