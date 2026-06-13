import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contact {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  notify_on_missed_medication?: boolean;
  notify_on_taken_medication?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Active chronic/daily prescriptions with reminders + times
    const { data: rxs, error: rxErr } = await supabase
      .from("prescriptions")
      .select("id, patient_id, medication, dosage, frequency, reminder_times, is_chronic, missed_alert_after_minutes, status, reminders_enabled")
      .eq("status", "active")
      .eq("reminders_enabled", true)
      .not("reminder_times", "is", null);

    if (rxErr) throw rxErr;

    let missedCreated = 0;
    let contactNotified = 0;

    for (const rx of rxs ?? []) {
      const r = rx as any;
      const freq = (r.frequency ?? "").toLowerCase();
      const isDaily = r.is_chronic === true || ["daily", "twice_daily", "weekdays"].includes(freq);
      if (!isDaily) continue;

      const window = Math.max(5, Math.min(24 * 60, r.missed_alert_after_minutes ?? 30));
      const times: string[] = r.reminder_times ?? [];

      for (const t of times) {
        const [hh, mm] = t.split(":").map((n: string) => parseInt(n, 10));
        if (Number.isNaN(hh)) continue;
        const scheduled = new Date(now);
        scheduled.setUTCHours(hh, mm ?? 0, 0, 0);
        const minutesPast = (now.getTime() - scheduled.getTime()) / 60000;
        // Only act when we've passed the patient-set window, within a 10-min lookback
        if (minutesPast < window || minutesPast > window + 10) continue;

        const { data: existing } = await supabase
          .from("medication_adherence")
          .select("id, status, missed_alert_sent_at")
          .eq("prescription_id", r.id)
          .eq("scheduled_date", today)
          .maybeSingle();

        if (existing && ((existing as any).status === "taken" || (existing as any).status === "auto_approved")) continue;
        if (existing && (existing as any).missed_alert_sent_at) continue;

        // Mark missed
        if (existing) {
          await supabase
            .from("medication_adherence")
            .update({ status: "missed", missed_alert_sent_at: now.toISOString() })
            .eq("id", (existing as any).id);
        } else {
          await supabase
            .from("medication_adherence")
            .upsert({
              patient_id: r.patient_id,
              prescription_id: r.id,
              scheduled_date: today,
              status: "missed",
              missed_alert_sent_at: now.toISOString(),
            }, { onConflict: "patient_id,prescription_id,scheduled_date" });
        }
        missedCreated++;

        // Patient + contacts
        const { data: patient } = await supabase
          .from("patients")
          .select("patient_user_id, name, emergency_contacts, next_of_kin_members")
          .eq("id", r.patient_id)
          .maybeSingle();
        const p = patient as any;
        if (!p?.patient_user_id) continue;

        // Self notification
        await supabase.from("notifications").insert({
          user_id: p.patient_user_id,
          type: "medication_missed_self",
          title: `Missed dose: ${r.medication}`,
          body: `Scheduled ${t} — please take or mark as skipped.`,
          metadata: { prescription_id: r.id, scheduled_time: t },
        } as any);

        // Master switch
        const { data: prof } = await supabase
          .from("profiles")
          .select("notify_contacts_on_missed_meds, full_name")
          .eq("id", p.patient_user_id)
          .maybeSingle();
        if (!(prof as any)?.notify_contacts_on_missed_meds) continue;

        const patientLabel = (prof as any)?.full_name || p.name || "A patient";
        const contacts: Contact[] = [
          ...((p.emergency_contacts ?? []) as Contact[]),
          ...((p.next_of_kin_members ?? []) as Contact[]),
        ].filter((c) => c?.notify_on_missed_medication);

        for (const c of contacts) {
          // In-app for linked accounts
          if (c.email) {
            const { data: linked } = await supabase
              .from("profiles")
              .select("id")
              .ilike("email", c.email)
              .maybeSingle();
            if ((linked as any)?.id) {
              await supabase.from("notifications").insert({
                user_id: (linked as any).id,
                type: "medication_missed_contact",
                title: `${patientLabel} missed a dose`,
                body: `${r.medication} scheduled at ${t}.`,
                metadata: { prescription_id: r.id, patient_user_id: p.patient_user_id },
              } as any);
            }
            // Email fan-out
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: c.email,
                  subject: `Missed medication alert — ${patientLabel}`,
                  html: `<p>Hi ${c.name ?? ""},</p><p><strong>${patientLabel}</strong> has not yet taken their <strong>${r.medication}</strong> scheduled for ${t}.</p><p>You are receiving this because they listed you as an emergency contact and asked to be alerted on missed doses.</p>`,
                },
              });
            } catch (_) { /* swallow */ }
          }
          contactNotified++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, missedCreated, contactNotified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
