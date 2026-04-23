import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CalendarConnection {
  id: string;
  provider: string;
  last_sync_at: string | null;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnection();
    } else {
      setConnection(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-calendar-callback') {
        if (event.data.success) {
          toast.success('Google Calendar connected successfully!');
          fetchConnection();
        } else {
          toast.error('Failed to connect Google Calendar');
        }
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, provider, last_sync_at')
        .eq('provider', 'google')
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error fetching calendar connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const connect = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('google-calendar-auth', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      
      const { authUrl } = response.data;
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('Failed to start Google Calendar connection');
      setIsConnecting(false);
    }
  }, [user]);

  const disconnect = useCallback(async () => {
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;
      
      setConnection(null);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
  }, [connection]);

  const syncEvent = useCallback(async (action: 'create' | 'update' | 'delete', appointment: any) => {
    if (!connection) {
      console.log('No calendar connection, skipping sync');
      return null;
    }

    // Individual-only sync: never mirror another doctor's appointments to this user's Google Calendar
    if (appointment?.user_id && user?.id && appointment.user_id !== user.id) {
      console.log('Skipping Google sync: appointment owned by another doctor');
      return null;
    }

    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('google-calendar-sync', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action, appointment },
      });

      if (response.error) throw response.error;
      
      return response.data;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync with Google Calendar');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [connection, user]);

  const fetchGoogleEvents = useCallback(async () => {
    if (!connection) return [];

    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('google-calendar-sync', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action: 'fetch' },
      });

      if (response.error) throw response.error;
      
      return response.data?.events || [];
    } catch (error) {
      console.error('Error fetching Google events:', error);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [connection]);

  return {
    isConnected: !!connection,
    connection,
    loading,
    isConnecting,
    isSyncing,
    connect,
    disconnect,
    syncEvent,
    fetchGoogleEvents,
  };
}
