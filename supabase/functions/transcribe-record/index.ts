import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Transcribes an uploaded scan or photo of a handwritten / printed clinical
 * record into plain text so historical paper files can be rebuilt in-app.
 */
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
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileUrl, mimeType, fileName } = await req.json();
    if (!fileUrl || typeof fileUrl !== "string") {
      return new Response(JSON.stringify({ error: "fileUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPdf = (mimeType || "").includes("pdf");
    const instruction =
      "Transcribe this clinical record exactly as written, preserving headings, dates, " +
      "medication names and dosages. Use plain text with line breaks. If a word is " +
      "illegible, write [illegible]. Do not add commentary or interpretation.";

    let contentBlock: unknown;
    if (isPdf) {
      const fileRes = await fetch(fileUrl);
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      contentBlock = [
        { type: "text", text: instruction },
        {
          type: "file",
          file: { filename: fileName || "record.pdf", file_data: `data:application/pdf;base64,${base64}` },
        },
      ];
    } else {
      contentBlock = [
        { type: "text", text: instruction },
        { type: "image_url", image_url: { url: fileUrl } },
      ];
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        stream: true,
        messages: [{ role: "user", content: contentBlock }],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Transcription failed: ${aiRes.status} ${detail}` }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume the stream inside the function so long transcriptions don't time out.
    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          text += json?.choices?.[0]?.delta?.content ?? "";
        } catch {
          /* ignore partial frames */
        }
      }
    }

    return new Response(JSON.stringify({ text: text.trim() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : "Unknown error";
    console.error("transcribe-record error:", messageText);
    return new Response(JSON.stringify({ error: messageText }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
