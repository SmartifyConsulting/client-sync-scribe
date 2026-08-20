import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, documentId, storagePath, bucket } = await req.json();
    if (!imageUrl || !documentId) {
      return new Response(
        JSON.stringify({ error: "imageUrl and documentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Our storage buckets are private, so a public URL is not readable by the
    // AI provider (and often not by us either). Pull the bytes with the service
    // role and inline them as a base64 data URL.
    const storageBucket = bucket || "patient-media";
    let path: string | null = storagePath || null;
    if (!path && typeof imageUrl === "string") {
      const match = imageUrl.match(
        new RegExp(`/storage/v1/object/(?:public|sign)/${storageBucket}/(.+?)(?:\\?|$)`),
      );
      if (match) path = decodeURIComponent(match[1]);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let inlineUrl: string | null = null;
    let downloadProblem = "";
    try {
      let bytes: Uint8Array | null = null;
      let mime = "image/jpeg";

      if (path) {
        const { data: blob, error: dlError } = await admin.storage
          .from(storageBucket)
          .download(path);
        if (dlError || !blob) throw new Error(dlError?.message || "file not found in storage");
        bytes = new Uint8Array(await blob.arrayBuffer());
        mime = blob.type || mime;
      } else {
        const fileResponse = await fetch(imageUrl);
        if (!fileResponse.ok) {
          throw new Error(`could not download the image (${fileResponse.status})`);
        }
        bytes = new Uint8Array(await fileResponse.arrayBuffer());
        mime = fileResponse.headers.get("content-type")?.split(";")[0] || mime;
      }

      if (!bytes || bytes.byteLength === 0) throw new Error("the uploaded image is empty");
      if (bytes.byteLength > 15 * 1024 * 1024) {
        throw new Error("the image is larger than 15MB");
      }
      if (!mime.startsWith("image/")) mime = "image/jpeg";

      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      inlineUrl = `data:${mime};base64,${btoa(binary)}`;
    } catch (downloadError) {
      downloadProblem = (downloadError as Error)?.message || "unknown error";
      console.error("Image download failed:", downloadProblem);
    }

    if (!inlineUrl) {
      return new Response(
        JSON.stringify({ error: `The image could not be read: ${downloadProblem}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Call Lovable AI with the image for analysis

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a medical imaging analysis assistant. Analyse the provided medical image (X-ray, MRI, CT scan, ultrasound, photograph, or other clinical image) and provide a structured interpretation.

Your response must include:
1. **Image Type**: Identify what kind of image this is (X-ray, MRI, CT, ultrasound, clinical photo, etc.)
2. **Region/Area**: The body part or anatomical region shown
3. **Observations**: Key findings visible in the image, described clearly
4. **Possible Findings**: Any abnormalities, areas of concern, or notable features
5. **Summary**: A brief plain-language summary of the overall assessment

IMPORTANT DISCLAIMER: Always conclude with:
"⚠️ This AI analysis is for informational purposes only and does not constitute a medical diagnosis. Always consult a qualified healthcare professional for clinical interpretation and treatment decisions."`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyse this medical image and provide a detailed interpretation.",
                },
                {
                  type: "image_url",
                  image_url: { url: inlineUrl },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed (${aiResponse.status}): ${errorText.slice(0, 300)}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices?.[0]?.message?.content || "No analysis available.";

    // Save analysis to the document using service role for reliability
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await serviceClient
      .from("documents")
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Failed to save analysis:", updateError);
      // Still return the analysis even if save fails
    }

    return new Response(
      JSON.stringify({ analysis, analyzedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-medical-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
