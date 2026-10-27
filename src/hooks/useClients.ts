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

export interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string;
  date_identified?: string;
}

export interface Client {
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
  allergies_structured?: Allergy[] | null;
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

const parseAllergiesStructured = (data: Json | null): Allergy[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) return data as unknown as Allergy[];
  return null;
};

// Helper to convert client from DB to typed Client
const toClient = (data: any, lastVisit?: string | null): Client => ({
  ...data,
  surgeries: parseSurgeries(data.surgeries),
  pharmacies: parsePharmacies(data.pharmacies),
  family_history: parseFamilyHistory(data.family_history),
  next_of_kin_members: parseNOKMembers(data.next_of_kin_members),
  current_medications: parseCurrentMedications(data.current_medications),
  conditions_diagnoses: parseConditionsDiagnoses(data.conditions_diagnoses),
  allergies_structured: parseAllergiesStructured(data.allergies_structured),
  last_visit: lastVisit ?? data.last_visit ?? null,
});

// Helper to prepare client data for DB (convert surgeries/pharmacies to JSON)
const toDbClient = (updates: Partial<Client>): Record<string, any> => {
  const { surgeries, pharmacies, family_history, organ_donor_organs, last_visit, next_of_kin_members, current_medications, conditions_diagnoses, allergies_structured, ...rest } = updates as any;
  return {
    ...rest,
    ...(surgeries !== undefined ? { surgeries: surgeries as unknown as Json } : {}),
    ...(pharmacies !== undefined ? { pharmacies: pharmacies as unknown as Json } : {}),
    ...(family_history !== undefined ? { family_history: family_history as unknown as Json } : {}),
    ...(organ_donor_organs !== undefined ? { organ_donor_organs: organ_donor_organs as unknown as Json } : {}),
    ...(next_of_kin_members !== undefined ? { next_of_kin_members: next_of_kin_members as unknown as Json } : {}),
    ...(current_medications !== undefined ? { current_medications: current_medications as unknown as Json } : {}),
    ...(conditions_diagnoses !== undefined ? { conditions_diagnoses: conditions_diagnoses as unknown as Json } : {}),
    ...(allergies_structured !== undefined ? { allergies_structured: allergies_structured as unknown as Json } : {}),
  };
};

// Helper to determine if client should be inactive based on last visit and threshold
const shouldBeInactive = (lastVisit: string | null, thresholdMonths: number): boolean => {
  if (!lastVisit) return false;
  const lastVisitDate = new Date(lastVisit);
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);
  return lastVisitDate < thresholdDate;
};

export function useClients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
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
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientsWithLastVisit = await Promise.all(
        (data || []).map(async (client) => {
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('started_at')
            .eq('patient_id', client.id)
            .eq('status', 'completed')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const lastVisit = sessionData?.started_at || null;
          const typedClient = toClient(client, lastVisit);
          
          const shouldSetInactive = shouldBeInactive(lastVisit, inactiveThresholdMonths);
          if (shouldSetInactive && typedClient.status === 'active') {
            await supabase
              .from('clients')
              .update({ status: 'inactive' })
              .eq('id', client.id);
            typedClient.status = 'inactive';
          } else if (!shouldSetInactive && lastVisit && typedClient.status === 'inactive') {
            await supabase
              .from('clients')
              .update({ status: 'active' })
              .eq('id', client.id);
            typedClient.status = 'active';
          }
          
          return typedClient;
        })
      );

      clientsWithLastVisit.sort((a, b) => {
        const aLast = a.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
        const bLast = b.name.trim().split(/\s+/).pop()?.toLowerCase() || '';
        if (aLast !== bLast) return aLast.localeCompare(bLast);
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      setClients(clientsWithLastVisit);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>, opts?: { silent?: boolean }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dbClient = toDbClient(client as Partial<Client>);

      if (client.patient_user_id) {
        const { data: existing, error: existingError } = await supabase
          .from('clients')
          .select('*')
          .eq('patient_user_id', client.patient_user_id)
          .neq('status', 'archived')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing) return toClient(existing);
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: client.name,
          ...dbClient,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' && client.patient_user_id) {
          const { data: existing } = await supabase
            .from('clients')
            .select('*')
            .eq('patient_user_id', client.patient_user_id)
            .neq('status', 'archived')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (existing) return toClient(existing);
        }
        throw error;
      }
      const typedClient = toClient(data);
      setClients((prev) => [typedClient, ...prev]);
      if (!opts?.silent) toast({ title: 'Success', description: 'Client added successfully' });
      return typedClient;
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add client',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const dbUpdates = toDbClient(updates);

      const { data, error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const typedClient = toClient(data);
      setClients((prev) => prev.map((p) => (p.id === id ? typedClient : p)));
      toast({ title: 'Success', description: 'Client updated successfully' });
      return typedClient;
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;
      setClients((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Success', description: 'Client deleted successfully' });
      return true;
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}

export function useClient(id: string) {
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
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
          .from('clients')
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

        setClient(toClient(resolved, sessionData?.started_at || null));
      } else {
        setClient(null);
      }
    } catch (error: any) {
      console.error('Error fetching client:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (updates: Partial<Client>) => {
    try {
      const dbUpdates = toDbClient(updates);
      const clientId = client?.id || id;

      const { data, error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      const typedClient = toClient(data);
      setClient(typedClient);
      toast({ title: 'Success', description: 'Client updated successfully' });
      return typedClient;
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    if (id) fetchClient();
  }, [id]);

  return { client, loading, updateClient, refetch: fetchClient };
}
