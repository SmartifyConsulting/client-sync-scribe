import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(getRedirectHtml(false, error), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response(getRedirectHtml(false, 'Missing authorization code'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let userId: string;
    try {
      const decoded = JSON.parse(atob(state));
      userId = decoded.userId;
    } catch {
      console.error('Invalid state parameter');
      return new Response(getRedirectHtml(false, 'Invalid state'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return new Response(getRedirectHtml(false, tokens.error_description || tokens.error), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('Token exchange successful for user:', userId);

    // Store tokens in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      // Try insert if upsert fails due to constraint
      const { error: insertError } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: userId,
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          calendar_id: 'primary',
        });

      if (insertError) {
        console.error('Database error:', insertError);
        return new Response(getRedirectHtml(false, 'Failed to save connection'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    console.log('Calendar connection saved for user:', userId);

    return new Response(getRedirectHtml(true), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: unknown) {
    console.error('Callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(getRedirectHtml(false, message), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});

function getRedirectHtml(success: boolean, errorMessage?: string): string {
  const message = success 
    ? 'Google Calendar connected successfully!' 
    : `Connection failed: ${errorMessage}`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Calendar Connection</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success { color: #22c55e; }
          .error { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="${success ? 'success' : 'error'}">${message}</h2>
          <p>This window will close automatically...</p>
        </div>
        <script>
          setTimeout(() => {
            window.opener?.postMessage({ type: 'google-calendar-callback', success: ${success} }, '*');
            window.close();
          }, 2000);
        </script>
      </body>
    </html>
  `;
}
