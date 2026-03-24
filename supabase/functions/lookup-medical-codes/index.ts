import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { query, codeSystem, country } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const countryNames: Record<string, string> = {
      ZA: "South Africa", US: "United States", GB: "United Kingdom",
      AU: "Australia", CA: "Canada", IN: "India", DE: "Germany",
      FR: "France", AE: "UAE", BW: "Botswana", NA: "Namibia",
    };
    const countryName = countryNames[country] || country || "International";

    const systemPrompt = `You are a medical coding reference assistant. You return accurate medical codes based on internationally published standards. Return ONLY a valid JSON array, no markdown, no explanation.`;

    const userPrompt = `Given the medical code system "${codeSystem}" for ${countryName}, return the top 8 matching codes for the search query "${query}".

Rules:
- Return real, accurate codes from published standards
- For ICD-10: use the standard ICD-10-CM/WHO codes
- For NHRPL: use South African National Health Reference Price List codes
- For CPT: use Current Procedural Terminology codes
- For OPCS: use UK OPCS-4 codes
- For MBS: use Australian Medicare Benefits Schedule codes
- Match by code prefix OR description keyword
- Return as JSON array: [{"code": "...", "description": "..."}]
- If no matches found, return []`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON array from response (handle markdown wrapping)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const codes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify(codes), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lookup-medical-codes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
