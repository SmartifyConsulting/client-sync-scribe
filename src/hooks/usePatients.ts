import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  last_visit?: string | null;
}

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
          
          return {
            ...patient,
            last_visit: sessionData?.started_at || null,
          };
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

      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...patient,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setPatients((prev) => [data, ...prev]);
      toast({ title: 'Success', description: 'Patient added successfully' });
      return data;
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
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPatients((prev) => prev.map((p) => (p.id === id ? data : p)));
      toast({ title: 'Success', description: 'Patient updated successfully' });
      return data;
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
        
        setPatient({
          ...data,
          last_visit: sessionData?.started_at || null,
        });
      } else {
        setPatient(data);
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
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPatient(data);
      toast({ title: 'Success', description: 'Patient updated successfully' });
      return data;
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