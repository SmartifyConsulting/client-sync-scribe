import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  notify_on_taken_medication?: boolean;
}

/**
 * Invoked by the client right after marking an adherence row `taken`/`auto_approved`.
 * Idempotent via `medication_adherence.taken_alert_sent_at`.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { adherence_id } = await req.json();
    if (!adherence_id) {
      return new Response(JSON.stringify({ error: "adherence_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: adh } = await supabase
      .from("medication_adherence")
      .select("id, patient_id, prescription_id, scheduled_date, status, taken_alert_sent_at")
      .eq("id", adherence_id)
      .maybeSingle();
    const a = adh as any;
    if (!a || a.taken_alert_sent_at) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["taken", "auto_approved"].includes(a.status)) {
      return new Response(JSON.stringify({ ok: true, skipped: "not_taken" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rx } = await supabase
      .from("prescriptions")
      .select("id, medication, alert_contacts_on_taken")
      .eq("id", a.prescription_id)
      .maybeSingle();
    if (!(rx as any)?.alert_contacts_on_taken) {
      await supabase.from("medication_adherence").update({ taken_alert_sent_at: new Date().toISOString() }).eq("id", a.id);
      return new Response(JSON.stringify({ ok: true, skipped: "per_med_off" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("patient_user_id, name, emergency_contacts, next_of_kin_members")
      .eq("id", a.patient_id)
      .maybeSingle();
    const p = patient as any;
    if (!p?.patient_user_id) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("notify_contacts_on_taken_meds, full_name")
      .eq("id", p.patient_user_id)
      .maybeSingle();
    if (!(prof as any)?.notify_contacts_on_taken_meds) {
      await supabase.from("medication_adherence").update({ taken_alert_sent_at: new Date().toISOString() }).eq("id", a.id);
      return new Response(JSON.stringify({ ok: true, skipped: "master_off" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientLabel = (prof as any)?.full_name || p.name || "A patient";
    const med = (rx as any)?.medication ?? "their medication";
    const contacts: Contact[] = [
      ...((p.emergency_contacts ?? []) as Contact[]),
      ...((p.next_of_kin_members ?? []) as Contact[]),
    ].filter((c) => c?.notify_on_taken_medication);

    for (const c of contacts) {
      if (!c.email) continue;
      const { data: linked } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", c.email)
        .maybeSingle();
      if ((linked as any)?.id) {
        await supabase.from("notifications").insert({
          user_id: (linked as any).id,
          type: "medication_taken_contact",
          title: `${patientLabel} took their medication`,
          body: `${med} — dose confirmed.`,
          metadata: { prescription_id: a.prescription_id, patient_user_id: p.patient_user_id },
        } as any);
      }
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: c.email,
            subject: `Medication taken — ${patientLabel}`,
            html: `<p>Hi ${c.name ?? ""},</p><p><strong>${patientLabel}</strong> has just confirmed taking <strong>${med}</strong>.</p>`,
          },
        });
      } catch (_) { /* swallow */ }
    }

    await supabase.from("medication_adherence").update({ taken_alert_sent_at: new Date().toISOString() }).eq("id", a.id);
    return new Response(JSON.stringify({ ok: true, notified: contacts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
