import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { imageUrls, filePaths, prescriptionId, patientId } = body;

    // Support both old single-image and new multi-frame format
    const urls: string[] = imageUrls || (body.videoUrl ? [body.videoUrl] : []);
    const paths: string[] = filePaths || (body.filePath ? [body.filePath] : []);

    if (urls.length === 0 || !prescriptionId || !patientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrls/videoUrl, prescriptionId, patientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Helpers
    const cleanupAllFiles = async () => {
      if (paths.length > 0) {
        const { error } = await supabase.storage.from('patient-media').remove(paths);
        if (error) console.error('Failed to delete frame files:', error);
        else console.log('Deleted', paths.length, 'frame files from storage');
      }
    };

    const cleanupExceptFirst = async () => {
      if (paths.length > 1) {
        const toDelete = paths.slice(1);
        const { error } = await supabase.storage.from('patient-media').remove(toDelete);
        if (error) console.error('Failed to delete frame files (keep first):', error);
        else console.log('Deleted', toDelete.length, 'frames; kept first for review');
      }
    };

    // Save a "pending_review" adherence row preserving the first frame as evidence
    const savePendingReview = async () => {
      try {
        const firstFrameUrl = urls[0] || null;

        // Look for an existing row for today
        const { data: existing } = await supabase
          .from('medication_adherence')
          .select('id')
          .eq('patient_id', patientId)
          .eq('prescription_id', prescriptionId)
          .eq('scheduled_date', today)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from('medication_adherence')
            .update({
              status: 'pending_review',
              taken_at: new Date().toISOString(),
              proof_url: firstFrameUrl,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('medication_adherence').insert({
            patient_id: patientId,
            prescription_id: prescriptionId,
            scheduled_date: today,
            status: 'pending_review',
            taken_at: new Date().toISOString(),
            proof_url: firstFrameUrl,
          });
        }
      } catch (e) {
        console.error('savePendingReview failed:', e);
      }
    };

    // Build multi-frame sequential validation prompt
    const validationPrompt = `You are a healthcare compliance validator. You are given ${urls.length} frames extracted from a short video, in chronological order. Your task is to determine whether they show a person actively taking oral medication through the full ingestion sequence.

Analyse the SEQUENCE of frames for ALL of these criteria:

1. **Person visible**: The same person must be clearly visible across the frames.
2. **Medication visible**: In the early frames, a pill, tablet, capsule, or liquid medicine must be visible (e.g. held in hand, shown to camera).
3. **Ingestion action**: The middle-to-late frames must show the person placing the medication into their mouth.
4. **Completion**: The final frame(s) should show the person has swallowed — ideally an open, empty mouth.

IMPORTANT: Respond with a JSON object in exactly this format:
{
  "isValid": true or false,
  "confidence": number between 0 and 100,
  "description": "brief description of what the sequence shows",
  "person_detected": true or false,
  "medication_detected": true or false,
  "ingestion_detected": true or false,
  "detected_elements": ["list", "of", "relevant", "elements"]
}

The sequence is VALID only if ALL criteria are met: same person throughout, medication visible in early frames, ingestion action in middle frames, and completion in late frames.
Only return the JSON, no other text.`;

    console.log(`Validating medication sequence with ${urls.length} frames for patient:`, patientId);

    // Build message content with all frames as image_url entries
    const content: any[] = [{ type: 'text', text: validationPrompt }];
    urls.forEach((url, i) => {
      content.push({ type: 'text', text: `Frame ${i + 1} of ${urls.length}:` });
      content.push({ type: 'image_url', image_url: { url } });
    });

    let aiResponse: Response;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content }],
        }),
      });
    } catch (fetchErr) {
      console.error('AI fetch threw:', fetchErr);
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: false,
          fallback: true,
          message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      console.error('AI validation failed:', aiResponse.status, errorText);
      // Save evidence for later review and return graceful fallback (200)
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: false,
          fallback: true,
          message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    console.log('AI response:', aiContent);

    let validationResult: any;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Treat as fallback so the patient's evidence is still recorded
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: false,
          fallback: true,
          message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validationResult.isValid) {
      // Happy path — confirmed ingestion
      const { error: updateError } = await supabase
        .from('medication_adherence')
        .update({ status: 'completed', taken_at: new Date().toISOString(), proof_url: null })
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('scheduled_date', today);
      if (updateError) console.error('Failed to update adherence:', updateError);

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

      // Check streak milestones
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
          if (streakRecords.some((r) => r.scheduled_date === dateStr)) {
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

      // Valid → no need to keep frames
      await cleanupAllFiles();

      return new Response(
        JSON.stringify({ ok: true, validation: validationResult, molesAwarded: 5 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI ran but said "no" — record as failed_verification, lock the row, no Vulas, keep first frame
    try {
      const firstFrameUrl = urls[0] || null;
      const { data: existing } = await supabase
        .from('medication_adherence')
        .select('id')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('scheduled_date', today)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('medication_adherence')
          .update({
            status: 'failed_verification',
            taken_at: new Date().toISOString(),
            proof_url: firstFrameUrl,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('medication_adherence').insert({
          patient_id: patientId,
          prescription_id: prescriptionId,
          scheduled_date: today,
          status: 'failed_verification',
          taken_at: new Date().toISOString(),
          proof_url: firstFrameUrl,
        });
      }
    } catch (e) {
      console.error('failed_verification update error:', e);
    }
    await cleanupExceptFirst();

    return new Response(
      JSON.stringify({ ok: true, validation: validationResult, molesAwarded: 0 }),
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
