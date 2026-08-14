import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "google/gemini-3.6-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id: sessionId, mode } = await req.json().catch(() => ({}));
    const recap = mode === "recap";
    if (typeof sessionId !== "string" || !sessionId) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: session } = await admin
      .from("ask_maeve_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await admin
      .from("ask_maeve_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // The summary is about the person, so their own words carry the transcript and
    // Angel's turns are only thin context.
    const rows = messages ?? [];
    const personTurns = rows.filter((m: any) => m.role === "user");
    const transcript = rows
      .map((m: any) =>
        m.role === "user"
          ? `Person: ${m.content}`
          : `(context — do not summarise) Angel: ${String(m.content).slice(0, 200)}`,
      )
      .join("\n");
    const hasPersonWords = personTurns.length > 0;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: recap
              ? "Write a short recap of what the PERSON said in an NLP facilitation conversation, addressed to them, " +
                "so they can pick it up again later. Summarise only their own words: what they came with, what they " +
                "said, felt and wanted, and where they had got to. Never describe Angel, her questions, her techniques " +
                "or the process — the lines marked as context exist only so the summary reads coherently. No advice, " +
                "no suggestions, no next steps, no interpretation, no diagnosis, no praise. Plain British English, " +
                "3-5 short sentences, no lists."
              : "Write a short closing reflection of what the PERSON said in an NLP facilitation conversation, " +
              "addressed to them. Summarise only their own words: what they brought, what they said, felt and wanted, " +
              "and what shifted for them. Never describe Angel, her questions, her techniques or the process — the " +
              "lines marked as context exist only so the reflection reads coherently. No advice, no suggestions, " +
              "no next steps, no interpretation, no diagnosis, no praise. Plain British English, 3–5 short sentences, no lists. " +
              'End with exactly this question on its own line: "What, if anything, would you like to explore from here?"',
          },
          { role: "user", content: hasPersonWords ? transcript : "The person did not say anything yet." },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`ask-maeve-summary gateway failed [${res.status}]: ${body}`);
      return new Response(JSON.stringify({ error: "Summary failed", status: res.status, details: body }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const summary = json?.choices?.[0]?.message?.content?.trim() ?? "";

    await admin
      .from("ask_maeve_sessions")
      .update(
        recap
          ? { session_summary: summary }
          : { session_summary: summary, status: "closed", closed_at: new Date().toISOString() },
      )
      .eq("id", sessionId);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ask-maeve-summary failed:", err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
