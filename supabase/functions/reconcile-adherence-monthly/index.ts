import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Monthly auto-reconciliation of provisional medication doses.
 *
 * Runs daily via pg_cron. Only does work on the 1st of each month
 * (processes the previous calendar month) unless an explicit
 * { month: "YYYY-MM" } body is provided for retroactive runs.
 *
 * For each (patient, prescription) bucket of provisional rows in the
 * target month, average the confidence_score:
 *  - >= 50  → flip all to `completed`, stamp auto_approved_at
 *  - < 50   → flip all to `failed_verification` (no Vula clawback)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    try { body = await req.json(); } catch {}

    const today = new Date();
    let targetYear: number;
    let targetMonth: number; // 0-indexed

    if (typeof body?.month === 'string' && /^\d{4}-\d{2}$/.test(body.month)) {
      const [y, m] = body.month.split('-').map(Number);
      targetYear = y;
      targetMonth = m - 1;
    } else {
      // Default: only run when today is the 1st of the month
      if (today.getUTCDate() !== 1) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: 'Not the 1st of the month' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      targetYear = prev.getUTCFullYear();
      targetMonth = prev.getUTCMonth();
    }

    const start = new Date(Date.UTC(targetYear, targetMonth, 1));
    const end = new Date(Date.UTC(targetYear, targetMonth + 1, 1));
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const { data: rows, error } = await supabase
      .from('medication_adherence')
      .select('id, patient_id, prescription_id, confidence_score')
      .eq('status', 'provisional')
      .gte('scheduled_date', startDate)
      .lt('scheduled_date', endDate);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, month: monthLabel }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by (patient_id, prescription_id)
    type Bucket = { ids: string[]; sum: number; count: number; patient_id: string; prescription_id: string };
    const buckets = new Map<string, Bucket>();
    for (const r of rows) {
      const key = `${r.patient_id}::${r.prescription_id}`;
      if (!buckets.has(key)) {
        buckets.set(key, { ids: [], sum: 0, count: 0, patient_id: r.patient_id, prescription_id: r.prescription_id });
      }
      const b = buckets.get(key)!;
      b.ids.push(r.id);
      const c = typeof r.confidence_score === 'number' ? r.confidence_score : 0;
      b.sum += c;
      b.count += 1;
    }

    let approvedBuckets = 0;
    let rejectedBuckets = 0;
    const now = new Date().toISOString();

    for (const b of buckets.values()) {
      const avg = b.count > 0 ? b.sum / b.count : 0;
      const passed = avg >= 50;

      if (passed) {
        const note = `Auto-approved: monthly average confidence ${Math.round(avg)}% across ${b.count} dose${b.count === 1 ? '' : 's'}.`;
        const { error: updErr } = await supabase
          .from('medication_adherence')
          .update({ status: 'completed', auto_approved_at: now, reconciliation_note: note })
          .in('id', b.ids);
        if (updErr) console.error('reconcile update (pass) failed', updErr);
        approvedBuckets++;
      } else {
        const note = `Monthly average confidence ${Math.round(avg)}% across ${b.count} dose${b.count === 1 ? '' : 's'} — below 50% threshold.`;
        const { error: updErr } = await supabase
          .from('medication_adherence')
          .update({ status: 'failed_verification', reconciliation_note: note })
          .in('id', b.ids);
        if (updErr) console.error('reconcile update (fail) failed', updErr);
        rejectedBuckets++;
      }

      // Notify the patient (one consolidated notification per prescription)
      const { data: patient } = await supabase
        .from('patients')
        .select('patient_user_id, name')
        .eq('id', b.patient_id)
        .maybeSingle();
      const { data: rx } = await supabase
        .from('prescriptions')
        .select('medication')
        .eq('id', b.prescription_id)
        .maybeSingle();

      if (patient?.patient_user_id) {
        const med = rx?.medication || 'your medication';
        const title = passed
          ? `✅ ${monthLabel} adherence confirmed`
          : `⚠️ ${monthLabel} doses couldn't be confirmed`;
        const description = passed
          ? `Your ${med} doses for ${monthLabel} have been auto-approved (average confidence ${Math.round(avg)}%).`
          : `${b.count} ${med} dose${b.count === 1 ? '' : 's'} last month couldn't be confirmed clearly. Try to film the moment you swallow next month.`;
        await supabase.from('notifications').insert({
          user_id: patient.patient_user_id,
          title,
          description,
          type: passed ? 'adherence_auto_approved' : 'adherence_auto_rejected',
          reference_id: b.prescription_id,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month: monthLabel,
        processed: rows.length,
        buckets: buckets.size,
        approvedBuckets,
        rejectedBuckets,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reconcile-adherence-monthly:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
