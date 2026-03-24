import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sessionSummary, 
      sessionTranscript,
      patientName,
      patientAge,
      allergies,
      currentMedications,
      pastSessions,
      conditions,
      language
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build comprehensive patient context
    const patientContext = `
PATIENT PROFILE:
- Name: ${patientName || 'Unknown'}
- Age: ${patientAge || 'Unknown'}
- Known Allergies: ${allergies || 'None documented'}
- Current Medications: ${currentMedications?.length > 0 ? currentMedications.map((m: any) => `${m.medication} (${m.dosage}, ${m.frequency})`).join(', ') : 'None documented'}
- Known Conditions: ${conditions || 'None documented'}

HISTORICAL SESSIONS (Recent):
${pastSessions?.length > 0 ? pastSessions.map((s: any, i: number) => `
Session ${i + 1} (${s.date}):
Summary: ${s.summary || 'No summary available'}
`).join('\n') : 'No previous sessions documented'}

CURRENT SESSION:
Summary: ${sessionSummary || 'No summary available'}
${sessionTranscript ? `\nTranscript:\n${sessionTranscript}` : ''}
`;

    const systemPrompt = `You are an AI Clinical Decision Support Assistant designed to help healthcare professionals. Your role is to provide diagnostic considerations and clinical recommendations based on patient data.

IMPORTANT DISCLAIMERS:
- This is a decision support tool only, NOT a replacement for clinical judgment
- All recommendations require physician review and validation
- This analysis is confidential and for healthcare provider use only

Your response should be structured as follows:
1. CLINICAL IMPRESSION: A brief assessment of the presenting concerns
2. DIFFERENTIAL DIAGNOSES: List 2-5 possible diagnoses in order of likelihood, with brief rationale
3. RECOMMENDED INVESTIGATIONS: Suggest relevant tests or examinations if warranted
4. TREATMENT CONSIDERATIONS: Potential treatment approaches to consider
5. RED FLAGS: Any concerning symptoms that require immediate attention
6. FOLLOW-UP RECOMMENDATIONS: Suggested follow-up timeline and monitoring

Be concise, evidence-based, and clinically relevant. Use medical terminology appropriate for a healthcare professional audience.${language && language !== 'English' ? `\n\nIMPORTANT: Respond entirely in ${language}.` : ''}`;

    console.log('Generating AI clinician diagnostic recommendation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze the following patient data and provide your clinical decision support recommendations:\n\n${patientContext}` }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate diagnostic recommendation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content;

    if (!recommendation) {
      return new Response(
        JSON.stringify({ error: 'No recommendation generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI clinician recommendation generated successfully');

    return new Response(
      JSON.stringify({ 
        recommendation,
        disclaimer: 'This AI-generated analysis is for clinical decision support only. All recommendations require physician review and clinical judgment.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-clinician-diagnosis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
