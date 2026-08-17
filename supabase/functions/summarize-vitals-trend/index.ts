import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** One-line clinical trend summary across a patient's recent vitals readings. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { readings } = await req.json();
    if (!Array.isArray(readings) || readings.length === 0) {
      return new Response(JSON.stringify({ summary: "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const table = readings
      .map((r: any) =>
        `${r.recorded_at}: HR ${r.heart_rate ?? "—"}bpm, BP ${r.bp_systolic ?? "—"}/${r.bp_diastolic ?? "—"}, SpO2 ${r.spo2 ?? "—"}%, Temp ${r.temperature_c ?? "—"}°C, RR ${r.respiratory_rate ?? "—"}`,
      )
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical assistant summarising a hospital inpatient's vitals trend for the ward nurse. Given a list of vitals readings (newest first), write ONE short sentence (max 25 words) describing the overall trend — e.g. whether heart rate, blood pressure, SpO2 or temperature are stable, improving, or worsening. Be factual and concise. No preamble, no disclaimers, just the sentence.",
          },
          { role: "user", content: table },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Vitals summary API error:", response.status, errText);
      throw new Error("Summary API error");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
