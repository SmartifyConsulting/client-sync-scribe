import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  title: string | null;
  notes: string | null;
  transcript: string | null;
  summary: string | null;
  action_points: string[];
  audio_url: string | null;
  duration_minutes: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
  };
}

// Helper to transform database session to our Session type
const transformSession = (dbSession: any): Session => ({
  ...dbSession,
  action_points: Array.isArray(dbSession.action_points) 
    ? dbSession.action_points.map((ap: Json) => String(ap))
    : [],
});

export function useSessions(patientId?: string) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .order('started_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setSessions((data || []).map(transformSession));
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (patientId: string, title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          patient_id: patientId,
          title: title || `Session - ${new Date().toLocaleDateString()}`,
          status: 'in_progress',
        })
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();

      if (error) throw error;
      
      const transformedData = transformSession(data);
      setSessions((prev) => [transformedData, ...prev]);
      toast({ title: 'Session Started', description: 'New session has been created' });
      return transformedData;
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateSession = async (id: string, updates: Partial<Omit<Session, 'action_points'>> & { action_points?: string[] }) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();

      if (error) throw error;
      
      const transformedData = transformSession(data);
      setSessions((prev) => prev.map((s) => (s.id === id ? transformedData : s)));
      return transformedData;
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session',
        variant: 'destructive',
      });
      return null;
    }
  };

const completeSession = async (
    id: string | null, 
    content: string, 
    additionalNotes?: string, 
    visitCategory?: string,
    creationData?: { patient_id: string; title: string; started_at: string; audio_url?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Combine transcript and notes for AI analysis
      const fullContent = additionalNotes 
        ? `${content}\n\nAdditional Notes:\n${additionalNotes}`
        : content;

      console.log('Completing session with content length:', fullContent?.length);

      // Generate AI summary from transcript/notes
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-session', {
        body: { notes: additionalNotes, transcript: content },
      });

      if (summaryError) {
        console.error('AI summary error:', summaryError);
      }

      console.log('Summary data received:', summaryData);

      const now = new Date().toISOString();
      const startedAt = creationData?.started_at || now;
      const durationMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      const patientId = creationData?.patient_id || '';

      const sessionRecord: any = {
        user_id: user.id,
        patient_id: patientId,
        title: creationData?.title || `Session - ${new Date().toLocaleDateString()}`,
        transcript: content,
        notes: additionalNotes || null,
        status: 'completed',
        started_at: startedAt,
        ended_at: now,
        duration_minutes: durationMinutes,
        audio_url: creationData?.audio_url || null,
      };

      if (summaryData && !summaryData.error) {
        sessionRecord.summary = summaryData.summary;
        sessionRecord.action_points = summaryData.action_points || [];
      }

      // Store extracted documents metadata for return
      const extractedDocuments = {
        medical_certificate: summaryData?.medical_certificate || null,
        prescription: summaryData?.prescription || null,
        invoice: summaryData?.invoice || null,
        referral: summaryData?.referral || null,
      };

      let sessionId = id;
      let resultData: any;

      if (sessionId) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionRecord)
          .eq('id', sessionId)
          .select(`*, patient:patients(id, name)`)
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        // Insert new session directly as completed
        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionRecord)
          .select(`*, patient:patients(id, name)`)
          .single();
        if (error) throw error;
        resultData = data;
        sessionId = resultData.id;
      }

      const transformedData = { ...transformSession(resultData), _extractedDocuments: extractedDocuments };
      setSessions((prev) => {
        const exists = prev.some(s => s.id === sessionId);
        if (exists) return prev.map(s => s.id === sessionId ? transformedData : s);
        return [transformedData, ...prev];
      });

      // Auto-add action points to todos
      if (summaryData?.action_points?.length > 0) {
        const todosToInsert = summaryData.action_points.map((point: string) => ({
          user_id: user.id,
          session_id: sessionId,
          patient_id: patientId || null,
          title: point,
          priority: 'medium',
          status: 'pending',
        }));
        
        const { error: todoError } = await supabase.from('todos').insert(todosToInsert);
        if (todoError) console.error('Error adding todos:', todoError);
        else console.log('Added', todosToInsert.length, 'todos from session');
      }

      // Award moola for qualifying visits
      if (visitCategory && patientId) {
        const { data: configData } = await supabase
          .from('gamification_config')
          .select('lollipops_awarded')
          .eq('visit_category', visitCategory)
          .eq('is_active', true)
          .maybeSingle();
        
        const lollipopsToAward = configData?.lollipops_awarded || 1;

        const { data: patientData } = await supabase
          .from('patients')
          .select('patient_user_id')
          .eq('id', patientId)
          .maybeSingle();

        const { data: rewardData, error: rewardError } = await supabase
          .from('patient_rewards')
          .insert({
            patient_id: patientId,
            session_id: sessionId,
            reward_type: 'lollipop',
            visit_category: visitCategory,
            lollipops_count: lollipopsToAward,
            awarded_by: user.id,
          })
          .select()
          .single();

        if (rewardError) {
          console.error('Error awarding moola:', rewardError);
        } else {
          console.log('Moola awarded for:', visitCategory, 'count:', lollipopsToAward);
          
          if (patientData?.patient_user_id) {
            await supabase.from('notifications').insert({
              user_id: patientData.patient_user_id,
              title: `Ⓜ️ You earned ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''}!`,
              description: `Great job! You received ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} for your ${visitCategory}.`,
              type: 'reward',
              reference_id: rewardData.id,
            });
          }

          toast({ 
            title: `Ⓜ️ ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} Awarded!`, 
            description: `Patient earned ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} for their ${visitCategory}` 
          });
        }
      }

      toast({ title: 'Session Completed', description: 'Session saved with AI summary and action items added to to-do list' });
      return transformedData;
    } catch (error: any) {
      console.error('Error completing session:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete session',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);

      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Success', description: 'Session deleted successfully' });
      return true;
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [patientId]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    completeSession,
    deleteSession,
  };
}

export function useSession(id: string) {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            *,
            patient:patients(id, name)
          `)
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setSession(transformSession(data));
        }
      } catch (error: any) {
        console.error('Error fetching session:', error);
        toast({
          title: 'Error',
          description: 'Failed to load session',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSession();
  }, [id]);

  return { session, loading };
}