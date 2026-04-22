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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { patientId, nokName, nokEmail, relationship } = body || {};

    if (!nokName || !nokEmail) {
      return new Response(
        JSON.stringify({ error: 'nokName and nokEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nokEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service-role client to fetch patient name & verify access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let patientName = 'A patient';
    if (patientId) {
      const { data: patient } = await supabase
        .from('patients')
        .select('name, patient_user_id, user_id')
        .eq('id', patientId)
        .maybeSingle();
      if (patient) {
        // Verify caller is the patient OR a doctor with active access
        const isPatient = patient.patient_user_id === user.id || patient.user_id === user.id;
        let allowed = isPatient;
        if (!allowed && patient.patient_user_id) {
          const { data: access } = await supabase
            .from('doctor_patient_access')
            .select('id')
            .eq('doctor_id', user.id)
            .eq('patient_user_id', patient.patient_user_id)
            .eq('is_active', true)
            .maybeSingle();
          allowed = !!access;
        }
        if (!allowed) {
          return new Response(
            JSON.stringify({ error: 'Forbidden' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        patientName = patient.name || patientName;
      }
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = `${patientName} has added you as a Next of Kin on Holarc`;
    const html = `
      <!doctype html>
      <html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#ffffff; color:#0f172a; max-width:560px; margin:0 auto; padding:24px;">
        <div style="border-top:4px solid #E01837; padding-top:16px;">
          <h2 style="margin:0 0 16px; color:#0f172a;">You've been added as a Next of Kin</h2>
          <p>Hi ${nokName},</p>
          <p><strong>${patientName}</strong> has added you as a Next of Kin${relationship ? ` (${relationship})` : ''} on <strong>Holarc Health</strong>. This means you may be contacted in case of a medical emergency or if your loved one needs help managing their care.</p>
          <p style="background:#fff5f6; border-left:3px solid #E01837; padding:12px 14px; border-radius:6px;">
            Holarc only contacts Next of Kin when the patient adds them. <strong>We will never tell you if a patient removes you</strong> from their Next of Kin list, so there is no need to worry about awkward conversations.
          </p>
          <p>If you have any questions, please reply to ${patientName} directly.</p>
          <p style="color:#64748b; font-size:12px; margin-top:24px;">— The Holarc Health team</p>
        </div>
      </body></html>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Holarc Health <onboarding@resend.dev>',
        to: [nokEmail],
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('Resend failed:', resp.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, sent_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('notify-next-of-kin error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
