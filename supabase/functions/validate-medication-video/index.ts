import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, filePath, prescriptionId, patientId } = await req.json();
    const imageUrl = videoUrl; // Now receives image URL despite param name

    if (!videoUrl || !filePath || !prescriptionId || !patientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: videoUrl, filePath, prescriptionId, patientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AI vision prompt for medication ingestion detection
    const validationPrompt = `You are a healthcare compliance validator. Analyze this photo and determine if it shows a person actively taking medication.

Look for ALL of these indicators:
1. **Person visible**: A human face or person must be clearly visible
2. **Medication visible**: Pills, capsules, tablets, liquid medicine, inhaler, or medication containers must be visible
3. **Ingestion action**: Evidence of the person putting medication in their mouth, swallowing pills, drinking medicine, or using an inhaler

IMPORTANT: You must respond with a JSON object in exactly this format:
{
  "isValid": true or false,
  "confidence": number between 0 and 100,
  "description": "brief description of what you see",
  "person_detected": true or false,
  "medication_detected": true or false,
  "ingestion_detected": true or false,
  "detected_elements": ["list", "of", "relevant", "elements"]
}

The photo is VALID only if ALL three criteria are met: person visible, medication visible, and ingestion action detected.
Only return the JSON, no other text.`;

    console.log('Sending medication photo for AI validation, patient:', patientId);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: validationPrompt },
              { type: 'image_url', image_url: { url: videoUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        // Still delete the video on rate limit
        await supabase.storage.from('patient-media').remove([filePath]);
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        await supabase.storage.from('patient-media').remove([filePath]);
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI validation failed:', errorText);
      // Delete video even on error
      await supabase.storage.from('patient-media').remove([filePath]);
      throw new Error(`AI validation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    console.log('AI response:', aiContent);

    // Parse AI response
    let validationResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      validationResult = {
        isValid: false,
        confidence: 0,
        description: 'Could not validate video',
        person_detected: false,
        medication_detected: false,
        ingestion_detected: false,
        detected_elements: []
      };
    }

    // Always delete the video from storage (privacy)
    const { error: deleteError } = await supabase.storage.from('patient-media').remove([filePath]);
    if (deleteError) {
      console.error('Failed to delete video file:', deleteError);
    } else {
      console.log('Video file deleted from storage:', filePath);
    }

    // If valid, update adherence record and award moolas
    const today = new Date().toISOString().split('T')[0];

    if (validationResult.isValid) {
      // Update adherence record
      const { error: updateError } = await supabase
        .from('medication_adherence')
        .update({
          status: 'completed',
          taken_at: new Date().toISOString(),
          proof_url: null, // No video stored, just validation result
        })
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('scheduled_date', today);

      if (updateError) {
        console.error('Failed to update adherence:', updateError);
      }

      // Award 5 moolas for daily adherence
      const { data: patient } = await supabase
        .from('patients')
        .select('user_id, patient_user_id, name')
        .eq('id', patientId)
        .maybeSingle();

      if (patient?.patient_user_id) {
        await supabase.from('patient_rewards').insert({
          patient_id: patientId,
          awarded_by: patient.patient_user_id,
          lollipops_count: 5,
          visit_category: 'Medication Adherence',
          reward_type: 'medication_adherence',
        });
      }

      // Check streak milestones for doctor notification
      const { data: streakRecords } = await supabase
        .from('medication_adherence')
        .select('scheduled_date')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      if (streakRecords && patient) {
        let streak = 0;
        const checkDate = new Date();
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (streakRecords.some(r => r.scheduled_date === dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else break;
        }

        if (streak > 0 && streak % 7 === 0 && patient.user_id) {
          await supabase.from('notifications').insert({
            user_id: patient.user_id,
            title: '🔥 Medication Streak Achievement!',
            description: `${patient.name} has a ${streak}-day medication adherence streak! Consider congratulating them.`,
            type: 'medication_streak',
            reference_id: patientId,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        validation: validationResult,
        molesAwarded: validationResult.isValid ? 5 : 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-medication-video:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
