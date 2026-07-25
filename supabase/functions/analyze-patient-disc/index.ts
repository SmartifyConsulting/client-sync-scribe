import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SESSIONS = 25;
const MAX_TRANSCRIPT_CHARS = 4000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaAuth = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supaAuth.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const patient_id: string | undefined = body?.patient_id;
    if (!patient_id) return json({ error: "patient_id required" }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE);

    // Verify caller is a doctor with active access to this patient
    const { data: patient, error: pErr } = await supa
      .from("patients")
      .select("id, name, patient_user_id, user_id")
      .eq("id", patient_id)
      .maybeSingle();
    if (pErr || !patient) return json({ error: "Patient not found" }, 404);

    const { data: roleRow } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "doctor")
      .maybeSingle();
    const isDoctor = !!roleRow;

    let hasAccess = false;
    if (isDoctor) {
      // Owner of the patient record OR active access grant
      if (patient.user_id === user.id) {
        hasAccess = true;
      } else if (patient.patient_user_id) {
        const { data: dpa } = await supa
          .from("doctor_patient_access")
          .select("id")
          .eq("doctor_id", user.id)
          .eq("patient_user_id", patient.patient_user_id)
          .eq("is_active", true)
          .maybeSingle();
        hasAccess = !!dpa;
      }
    }
    if (!isDoctor || !hasAccess) return json({ error: "Forbidden" }, 403);

    // Load recent completed sessions for this patient
    const { data: sessions } = await supa
      .from("sessions")
      .select("id, started_at, transcript, summary, status")
      .eq("patient_id", patient_id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(MAX_SESSIONS);

    const list = (sessions || []).filter((s) => s.transcript || s.summary);
    if (list.length === 0) {
      return json({ error: "No completed sessions with content yet." }, 422);
    }

    const sessionBlocks = list
      .map((s, i) => {
        const t = (s.transcript || "").slice(0, MAX_TRANSCRIPT_CHARS);
        const sum = (s.summary || "").slice(0, 800);
        return `Session #${i + 1} (${s.started_at})\nSummary: ${sum}\nTranscript excerpt: ${t}`;
      })
      .join("\n\n---\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing — configure in Supabase secrets", hint: "Set LOVABLE_API_KEY environment variable in Supabase dashboard" }, 500);

    const systemPrompt = `You are a clinical behavioural analyst. From the patient's own words across their consultation transcripts and summaries, infer a DISC personality profile.

DISC dimensions:
- Dominance (D): decisive, direct, results-focused, challenging.
- Influence (I): enthusiastic, expressive, persuasive, sociable.
- Steadiness (S): patient, consistent, cooperative, calm.
- Conscientiousness (C): analytical, precise, cautious, systematic.

Score each dimension 0-100 based on observed behaviour in the patient's speech (tone, pacing, subject-matter, decision-making, emotional register). Identify the primary (highest) and secondary (second-highest) trait as one of "Dominance"|"Influence"|"Steadiness"|"Conscientiousness". Provide a concise 1-2 sentence rationale per dimension, grounded in specific behaviours or phrases observed (paraphrase, don't quote long strings). Never diagnose mental illness. Never invent behaviours not in the transcripts.

Respond ONLY with JSON matching the given schema.`;

    const userPrompt = `Patient: ${patient.name}\nSessions analysed: ${list.length}\n\n${sessionBlocks}`;

    let aiRes;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "disc_profile",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: [
                  "dominance", "influence", "steadiness", "conscientiousness",
                  "primary_trait", "secondary_trait",
                  "dominance_rationale", "influence_rationale",
                  "steadiness_rationale", "conscientiousness_rationale",
                ],
                properties: {
                  dominance: { type: "integer", minimum: 0, maximum: 100 },
                  influence: { type: "integer", minimum: 0, maximum: 100 },
                  steadiness: { type: "integer", minimum: 0, maximum: 100 },
                  conscientiousness: { type: "integer", minimum: 0, maximum: 100 },
                  primary_trait: { type: "string", enum: ["Dominance", "Influence", "Steadiness", "Conscientiousness"] },
                  secondary_trait: { type: "string", enum: ["Dominance", "Influence", "Steadiness", "Conscientiousness"] },
                  dominance_rationale: { type: "string" },
                  influence_rationale: { type: "string" },
                  steadiness_rationale: { type: "string" },
                  conscientiousness_rationale: { type: "string" },
                },
              },
            },
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: any) {
      console.error("Lovable API fetch error", fetchErr.message);
      return json({
        error: "Failed to connect to Lovable API",
        details: fetchErr.message,
        hint: "Check LOVABLE_API_KEY is set and Lovable API is accessible",
      }, 503);
    }

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errBody);
      return json({ error: "AI request failed", status: aiRes.status, details: errBody }, aiRes.status);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (!content) return json({ error: "AI returned no content" }, 500);

    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Failed to parse AI JSON:", content);
      return json({ error: "AI returned invalid JSON" }, 500);
    }

    const upsertPayload = {
      patient_id,
      dominance: parsed.dominance,
      influence: parsed.influence,
      steadiness: parsed.steadiness,
      conscientiousness: parsed.conscientiousness,
      primary_trait: parsed.primary_trait,
      secondary_trait: parsed.secondary_trait,
      dominance_rationale: parsed.dominance_rationale,
      influence_rationale: parsed.influence_rationale,
      steadiness_rationale: parsed.steadiness_rationale,
      conscientiousness_rationale: parsed.conscientiousness_rationale,
      sessions_analyzed: list.length,
      last_session_id: list[0]?.id ?? null,
      generated_at: new Date().toISOString(),
    };

    const { data: saved, error: upErr } = await supa
      .from("patient_disc_profiles")
      .upsert(upsertPayload, { onConflict: "patient_id" })
      .select()
      .maybeSingle();

    if (upErr) {
      console.error("upsert error", upErr);
      return json({ error: "Failed to save profile", details: upErr.message }, 500);
    }

    return json({ profile: saved });
  } catch (e: any) {
    console.error("analyze-patient-disc fatal", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
