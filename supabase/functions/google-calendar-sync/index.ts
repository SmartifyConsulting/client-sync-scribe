import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, appointment } = await req.json();
    console.log('Sync action:', action, 'for user:', user.id);

    // Get calendar connection
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: connection, error: connError } = await serviceSupabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (connError || !connection) {
      console.error('No calendar connection found');
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) < new Date()) {
      console.log('Token expired, refreshing...');
      accessToken = await refreshToken(connection.refresh_token, serviceSupabase, user.id);
    }

    if (action === 'fetch') {
      const events = await fetchGoogleEvents(accessToken, connection.calendar_id);
      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create' && appointment) {
      const event = await createGoogleEvent(accessToken, connection.calendar_id, appointment);
      
      // Update appointment with google_event_id
      if (event.id && appointment.id) {
        await supabase
          .from('appointments')
          .update({ google_event_id: event.id, synced_at: new Date().toISOString() })
          .eq('id', appointment.id);
      }

      return new Response(JSON.stringify({ event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' && appointment) {
      if (!appointment.google_event_id) {
        return new Response(JSON.stringify({ error: 'No Google event ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const event = await updateGoogleEvent(accessToken, connection.calendar_id, appointment);
      
      await supabase
        .from('appointments')
        .update({ synced_at: new Date().toISOString() })
        .eq('id', appointment.id);

      return new Response(JSON.stringify({ event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete' && appointment?.google_event_id) {
      await deleteGoogleEvent(accessToken, connection.calendar_id, appointment.google_event_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshToken(refreshToken: string, supabase: any, userId: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error}`);
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('calendar_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google');

  console.log('Token refreshed successfully');
  return tokens.access_token;
}

async function fetchGoogleEvents(accessToken: string, calendarId: string) {
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 3);

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
  url.searchParams.set('timeMin', timeMin.toISOString());
  url.searchParams.set('timeMax', timeMax.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  console.log(`Fetched ${data.items?.length || 0} events from Google Calendar`);
  return data.items || [];
}

async function createGoogleEvent(accessToken: string, calendarId: string, appointment: any) {
  const event = {
    summary: appointment.title,
    description: appointment.description,
    location: appointment.location,
    start: {
      dateTime: appointment.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: appointment.end_time,
      timeZone: 'UTC',
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  console.log('Created Google Calendar event:', data.id);
  return data;
}

async function updateGoogleEvent(accessToken: string, calendarId: string, appointment: any) {
  const event = {
    summary: appointment.title,
    description: appointment.description,
    location: appointment.location,
    start: {
      dateTime: appointment.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: appointment.end_time,
      timeZone: 'UTC',
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${appointment.google_event_id}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  console.log('Updated Google Calendar event:', appointment.google_event_id);
  return data;
}

async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    const data = await response.json();
    throw new Error(data.error?.message || 'Failed to delete event');
  }

  console.log('Deleted Google Calendar event:', eventId);
}
