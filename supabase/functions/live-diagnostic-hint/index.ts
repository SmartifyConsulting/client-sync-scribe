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

    const systemPrompt = `You are an experienced clinical safety assistant listening to a LIVE consultation.
The doctor is still in the room with the patient. Give them what they need to know RIGHT NOW.

You MUST actively cross-check what is being said against the patient context and raise an alert whenever any of these apply:
- "duplicate": the clinician is discussing or about to prescribe a drug (or a drug in the same class) the patient is ALREADY taking.
- "interaction": the drug/plan being discussed interacts badly with a current medication, or is counter-intuitive given a chronic condition.
- "allergy": the drug being discussed matches a documented allergy or a cross-reactive class.
- "recurrence": this complaint or a closely related one has occurred before — say so and quote the prior visit date.
- "red_flag": a symptom, sign or combination that needs urgent action or escalation.
- "gap": something important the doctor has not asked about yet and should.

Rules:
- Only raise an alert when the transcript actually supports it. Never invent medications or history.
- Each alert message is one sentence, specific, and names the drug/condition/date involved.
- severity: "critical" for anything unsafe or urgent, "caution" for anything to double-check, "info" otherwise.
- Keep the working impression to 2-3 sentences and make it clinically substantive, not generic.
- Never claim certainty and never repeat the transcript back.
${language ? `Respond in ${language}.` : ""}`;

    const userPrompt = `PATIENT CONTEXT:\n${patientContext}\n\nLIVE TRANSCRIPT SO FAR:\n${transcript.slice(-6000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_live_hint",
            description: "Emit a live clinical decision-support hint with safety alerts",
            parameters: {
              type: "object",
              properties: {
                suggestion: { type: "string", description: "2-3 sentence working impression of what is going on clinically" },
                alerts: {
                  type: "array",
                  description: "Safety cross-checks against current meds, allergies, conditions and prior visits. Empty if none apply.",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["duplicate", "interaction", "allergy", "recurrence", "red_flag", "gap"],
                      },
                      severity: { type: "string", enum: ["critical", "caution", "info"] },
                      message: { type: "string", description: "One specific sentence naming the drug/condition/date involved" },
                    },
                    required: ["type", "severity", "message"],
                    additionalProperties: false,
                  },
                },
                differentials: {
                  type: "array",
                  items: { type: "string" },
                  description: "Up to 4 short differentials the doctor should consider",
                },
                red_flags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Up to 3 red-flag symptoms/signs to rule out, if any",
                },
                suggested_investigations: {
                  type: "array",
                  items: { type: "string" },
                  description: "1-4 quick bedside checks or investigations to consider",
                },
              },
              required: ["suggestion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_live_hint" } },
        max_tokens: 900,
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: any = { suggestion: "", differentials: [], red_flags: [], alerts: [] };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Parse tool args error:", e);
      }
    } else if (data.choices?.[0]?.message?.content) {
      result.suggestion = data.choices[0].message.content;
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
