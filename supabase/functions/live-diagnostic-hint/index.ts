import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      transcript,
      patientAge,
      patientSex,
      currentMedications,
      chronicConditions,
      allergies,
      pastSessions,
      language,
    } = body || {};

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 30) {
      return new Response(
        JSON.stringify({ suggestion: "", differentials: [], red_flags: [], alerts: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const medLine = (m: any) =>
      typeof m === "string"
        ? m
        : [m.medication || m.name, m.dosage, m.frequency].filter(Boolean).join(" ");

    const patientContext = [
      patientAge ? `Age: ${patientAge}` : null,
      patientSex ? `Sex: ${patientSex}` : null,
      allergies ? `Documented allergies: ${allergies}` : "Documented allergies: none recorded",
      chronicConditions?.length ? `Chronic conditions: ${chronicConditions.join(", ")}` : null,
      currentMedications?.length
        ? `CURRENT MEDICATIONS (already prescribed):\n${currentMedications.slice(0, 20).map((m: any) => `- ${medLine(m)}`).join("\n")}`
        : "CURRENT MEDICATIONS: none recorded",
      Array.isArray(pastSessions) && pastSessions.length
        ? `PRIOR VISITS (most recent first):\n${pastSessions.slice(0, 5).map((s: any, i: number) => `- ${s.date || `Visit ${i + 1}`}: ${(s.summary || "").slice(0, 600)}`).join("\n")}`
        : "PRIOR VISITS: none recorded",
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are an experienced South African financial-advice assistant listening to a LIVE consultation between a Wealth Manager (financial adviser) and their client.
The adviser is still with the client. Give them what they need to know RIGHT NOW. Never use medical or clinical language.

Cross-check what is said against the client context and raise an alert whenever any of these apply:
- "duplicate": a product being discussed overlaps cover or an investment the client ALREADY holds.
- "interaction": a proposed product or change conflicts with the client's goals, risk profile, affordability or existing policies (e.g. replacing cover without a replacement comparison).
- "allergy": the client has stated they do not want something (a product type, insurer or risk level) and it is being proposed.
- "recurrence": this need or concern came up in a previous consultation — say so and quote the date.
- "red_flag": a compliance issue that must be addressed (FAIS/FICA disclosure, replacement of policies, affordability, vulnerable client, conflict of interest).
- "gap": a need the adviser has not yet explored (life, disability, income protection, severe illness, retirement, estate, beneficiaries).

Rules:
- Only raise an alert when the transcript actually supports it. Never invent products, figures or history.
- Each alert message is one sentence, specific, and names the product/need/date involved.
- severity: "critical" for compliance or suitability problems, "caution" for anything to double-check, "info" otherwise.
- The working impression is 2-3 sentences summarising the client's needs raised, products mentioned and follow-up actions.
- Never claim certainty and never repeat the transcript back. This is support for the adviser, not advice to the client.
${language ? `Respond in ${language}.` : ""}`;

    const userPrompt = `PATIENT CONTEXT:\n${patientContext}\n\nLIVE TRANSCRIPT SO FAR:\n${transcript.slice(-6000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: systemPrompt,
        input: userPrompt,
        text: {
          format: {
            type: "json_schema",
            name: "live_hint",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                suggestion: {
                  type: "string",
                  description: "2-3 sentence working impression of what is going on clinically",
                },
                alerts: {
                  type: "array",
                  description:
                    "Safety cross-checks against current meds, allergies, conditions and prior visits. Empty if none apply.",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      type: {
                        type: "string",
                        enum: ["duplicate", "interaction", "allergy", "recurrence", "red_flag", "gap"],
                      },
                      severity: { type: "string", enum: ["critical", "caution", "info"] },
                      message: { type: "string" },
                    },
                    required: ["type", "severity", "message"],
                  },
                },
                differentials: { type: "array", items: { type: "string" } },
                red_flags: { type: "array", items: { type: "string" } },
                suggested_investigations: { type: "array", items: { type: "string" } },
              },
              required: [
                "suggestion",
                "alerts",
                "differentials",
                "red_flags",
                "suggested_investigations",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Read the SSE stream and accumulate the answer text (reasoning runs can be
    // long; streaming keeps bytes flowing so the request is never severed).
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            answer += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            if (!answer) answer = evt.response.output_text;
          }
        } catch {
          // partial or non-JSON event line — ignore
        }
      }
    }

    let result: any = { suggestion: "", differentials: [], red_flags: [], alerts: [] };
    if (answer.trim()) {
      try {
        const match = answer.match(/\{[\s\S]*\}/);
        result = JSON.parse(match ? match[0] : answer);
      } catch (e) {
        console.error("Parse live hint error:", e);
        result.suggestion = answer.trim();
      }
    }
    result.alerts = Array.isArray(result.alerts) ? result.alerts : [];

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("live-diagnostic-hint error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
