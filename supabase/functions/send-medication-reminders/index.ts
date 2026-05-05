import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hh = now.getUTCHours().toString().padStart(2, "0");
    const mm = now.getUTCMinutes();

    // Pull active prescriptions with reminder_times
    const { data: rxs } = await supabase
      .from("prescriptions")
      .select("id, patient_id, medication, dosage, with_food, reminder_times, refills_remaining, refill_reminder_days, end_date, reminders_enabled")
      .eq("status", "active")
      .eq("reminders_enabled", true)
      .not("reminder_times", "is", null);

    let created = 0;
    for (const rx of rxs ?? []) {
      const times: string[] = (rx as any).reminder_times ?? [];
      // Fire when scheduled time is ~5 minutes ahead of "now" (cron runs every 5 min)
      const matches = times.some((t) => {
        const [h, m] = t.split(":").map((n) => parseInt(n, 10));
        if (Number.isNaN(h)) return false;
        const ahead = (h - parseInt(hh)) * 60 + (m - mm);
        return ahead >= 3 && ahead <= 7;
      });
      if (!matches) continue;

      const { data: adh } = await supabase
        .from("medication_adherence")
        .select("id, status")
        .eq("prescription_id", (rx as any).id)
        .eq("scheduled_date", today)
        .maybeSingle();
      if (adh && (adh as any).status !== "pending") continue;

      const { data: p } = await supabase
        .from("patients").select("patient_user_id").eq("id", (rx as any).patient_id).maybeSingle();
      const userId = (p as any)?.patient_user_id;
      if (!userId) continue;

      const food = (rx as any).with_food === "with_food"
        ? " — take with food"
        : (rx as any).with_food === "without_food"
        ? " — take on an empty stomach"
        : "";
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "medication_reminder",
        title: `Take ${(rx as any).medication} in 5 minutes`,
        body: `${(rx as any).dosage ?? ""}${food}`.trim(),
        metadata: { prescription_id: (rx as any).id, lead_minutes: 5 },
      } as any).then(() => { created++; }, () => {});
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
