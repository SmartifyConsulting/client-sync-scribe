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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Always read the caller's OWN profile — never trust client-supplied identity
    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("full_name, specialty, practice_number, doctor_number, practice_address, about_me")
      .eq("id", user.id)
      .maybeSingle();

    const body = await req.json().catch(() => ({}));
    const extraNotes: string = typeof body?.notes === "string" ? body.notes.slice(0, 1000) : "";
    const existing: string = (profile as any)?.about_me || "";

    const context = [
      profile?.full_name ? `Name: ${profile.full_name}` : null,
      profile?.specialty ? `Specialty: ${profile.specialty}` : null,
      profile?.practice_address ? `Practice location: ${profile.practice_address}` : null,
      profile?.practice_number ? `Practice number: ${profile.practice_number}` : null,
      existing ? `Existing draft to improve:\n${existing.slice(0, 2000)}` : null,
      extraNotes ? `Extra notes from the practitioner:\n${extraNotes}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You write warm, professional "About Me" introductions for healthcare practitioners, aimed at patients choosing a provider.
Rules:
- Write in the first person ("I ...").
- 150-300 words, well under 600 words. Plain prose, 2-3 short paragraphs, no markdown headings or bullet lists.
- Cover background/qualifications, philosophy of care, and what patients can expect.
- Never invent specific qualifications, awards, employers, or years of experience that are not supplied. Keep unsupplied details general.
- Output only the introduction text.`;

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
          { role: "user", content: context || "No profile details available. Write a general, honest introduction for a healthcare practitioner." },
        ],
        max_tokens: 800,
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
    const text: string = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ about_me: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-about-me error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
