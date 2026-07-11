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
      language,
    } = body || {};

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 30) {
      return new Response(
        JSON.stringify({ suggestion: "", differentials: [], red_flags: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const patientContext = [
      patientAge ? `Age: ${patientAge}` : null,
      patientSex ? `Sex: ${patientSex}` : null,
      chronicConditions?.length ? `Chronic conditions: ${chronicConditions.join(", ")}` : null,
      currentMedications?.length
        ? `Current meds: ${currentMedications.slice(0, 10).map((m: any) => m.name || m).join(", ")}`
        : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are an experienced clinician assistant listening to a live consultation.
Based on the ROLLING TRANSCRIPT so far, produce a very short live diagnostic hint the doctor can glance at WHILE still with the patient.
${language ? `Respond in ${language}.` : ""}
Be concise. Never claim certainty. Do not repeat the transcript. Focus on what the doctor should consider RIGHT NOW.`;

    const userPrompt = `${patientContext ? `PATIENT CONTEXT:\n${patientContext}\n\n` : ""}LIVE TRANSCRIPT SO FAR:\n${transcript.slice(-4000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_live_hint",
            description: "Emit a short live diagnostic hint",
            parameters: {
              type: "object",
              properties: {
                suggestion: { type: "string", description: "1-2 sentence working impression" },
                differentials: {
                  type: "array",
                  items: { type: "string" },
                  description: "Up to 3 short differentials the doctor should consider",
                },
                red_flags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Up to 3 red-flag symptoms/signs to rule out, if any",
                },
                suggested_investigations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional 1-3 quick bedside checks or investigations to consider",
                },
              },
              required: ["suggestion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_live_hint" } },
        max_tokens: 400,
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
    let result: any = { suggestion: "", differentials: [], red_flags: [] };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Parse tool args error:", e);
      }
    } else if (data.choices?.[0]?.message?.content) {
      result.suggestion = data.choices[0].message.content;
    }

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
