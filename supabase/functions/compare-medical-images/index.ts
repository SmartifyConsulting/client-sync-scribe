import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { imageUrls, imageLabels, comparisonType, patientId } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length < 2) {
      throw new Error('At least 2 image URLs are required');
    }

    if (imageUrls.length > 6) {
      throw new Error('Maximum 6 images allowed');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Build image content parts for the AI
    const imageParts = imageUrls.map((url: string, i: number) => {
      const label = imageLabels?.[i] || `Image ${i + 1}`;
      return { type: "text" as const, text: `[${label}]: ${url}` };
    });

    const typeDescriptions: Record<string, string> = {
      wound_progression: "wound healing progression over time",
      before_after_surgery: "before and after surgical procedure",
      treatment_progress: "treatment progress and response",
      general: "general medical image comparison",
    };

    const typeDesc = typeDescriptions[comparisonType] || typeDescriptions.general;

    const systemPrompt = `You are a medical image analysis AI assistant. You are comparing multiple medical images for ${typeDesc}. 

Provide a detailed, structured analysis including:
1. **Individual Image Observations**: Describe key findings in each image
2. **Comparative Analysis**: Identify changes, differences, and similarities between images
3. **Progression Assessment**: If applicable, assess whether conditions are improving, stable, or deteriorating
4. **Key Findings**: Highlight the most clinically significant observations
5. **Timeline Summary**: If dates/labels are provided, provide a timeline-based assessment

⚠️ MEDICAL DISCLAIMER: This AI-generated analysis is for informational purposes only and does not constitute a medical diagnosis. Always consult with a qualified healthcare professional for clinical decisions.`;

    const userContent = `Please compare and analyze the following ${imageUrls.length} medical images (${typeDesc}):\n\n${imageUrls.map((url: string, i: number) => `${imageLabels?.[i] || `Image ${i + 1}`}: ${url}`).join('\n')}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const analysis = aiResult.choices?.[0]?.message?.content || "No analysis generated.";

    // Save to database
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: saved, error: saveError } = await serviceClient
      .from('image_comparisons')
      .insert({
        patient_id: patientId,
        doctor_id: userId,
        image_urls: imageUrls,
        image_labels: imageLabels || [],
        comparison_type: comparisonType || 'general',
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving comparison:", saveError);
    }

    return new Response(JSON.stringify({ analysis, id: saved?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("compare-medical-images error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
