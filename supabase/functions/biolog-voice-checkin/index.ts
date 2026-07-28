import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured." }, 500);

    const body = await req.json().catch(() => null);
    if (!body?.audio || typeof body.audio !== "string") {
      return json({ error: "No audio was provided." }, 400);
    }

    const sections: { key: string; label: string }[] = Array.isArray(body.sections) ? body.sections : [];
    const foods: string[] = Array.isArray(body.foods) ? body.foods : [];
    const exercises: string[] = Array.isArray(body.exercises) ? body.exercises : [];
    const medications: string[] = Array.isArray(body.medications) ? body.medications : [];

    // Decode the base64 WAV the client recorded.
    const binary = Uint8Array.from(atob(body.audio), (c) => c.charCodeAt(0));
    if (binary.byteLength < 2048) return json({ error: "That recording was empty." }, 400);
    if (binary.byteLength > 20 * 1024 * 1024) return json({ error: "That recording is too long." }, 400);

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([binary], { type: "audio/wav" }), "recording.wav");

    const sttRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!sttRes.ok) {
      const detail = await sttRes.text().catch(() => "");
      return json({ error: `Transcription failed: ${detail || sttRes.status}` }, sttRes.status);
    }

    const stt = await sttRes.json();
    const transcript: string = stt?.text ?? "";
    if (!transcript.trim()) return json({ error: "Nothing was said in that recording." }, 400);

    const systemPrompt = `You turn a spoken daily health check-in into structured JSON.

Available rating keys (1-10 scale, 10 = highest/most intense):
${sections.map((s) => `- ${s.key}: ${s.label}`).join("\n") || "- (none configured)"}

Known foods: ${foods.join(", ") || "none"}
Known exercises: ${exercises.join(", ") || "none"}
Known medications: ${medications.join(", ") || "none"}

Rules:
- Only include rating keys the person actually spoke about.
- Prefer known food/exercise/medication names when the speaker clearly means them; otherwise use their own words.
- meals[].slot must be one of breakfast, lunch, dinner, snack.
- medications[].taken is true only when they said they took it.
- Put anything that doesn't fit the structure into "note".
Return ONLY JSON with this shape:
{"ratings":{},"meals":[{"slot":"","foods":[]}],"exercises":[{"name":"","duration":null,"performance":null}],"medications":[{"label":"","taken":true}],"note":""}`;

    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!chatRes.ok) {
      const detail = await chatRes.text().catch(() => "");
      return json({ error: `Could not read that check-in: ${detail || chatRes.status}` }, chatRes.status);
    }

    const chat = await chatRes.json();
    const raw = chat?.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return json({ ...parsed, transcript });
  } catch (err) {
    console.error("biolog-voice-checkin error", err);
    return json({ error: (err as Error).message || "Unexpected error." }, 500);
  }
});
