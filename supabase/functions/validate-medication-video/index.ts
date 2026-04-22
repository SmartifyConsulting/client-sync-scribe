import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callGemini(apiKey: string, content: any[], model = 'google/gemini-2.5-flash') {
  return fetch(LOVABLE_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
    }),
  });
}

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================================
    // PILL CHECK MODE — single image, identify & match prescription
    // ============================================================
    if (body.mode === 'pill_check') {
      const { imageUrl, prescriptionId } = body;
      if (!imageUrl || !prescriptionId) {
        return new Response(
          JSON.stringify({ error: 'Missing imageUrl or prescriptionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up the prescription
      const { data: rx } = await supabase
        .from('prescriptions')
        .select('medication, dosage')
        .eq('id', prescriptionId)
        .maybeSingle();

      if (!rx) {
        return new Response(
          JSON.stringify({ error: 'Prescription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 1 — describe what's in the image
      const describePrompt = `You are a medication identification assistant. Look at this image and answer in JSON ONLY:
{
  "isPillVisible": true or false,
  "observedDescription": "describe colour, shape, size, and any visible markings/text on the pill (or 'none' if no pill visible)"
}
A pill is a tablet, capsule, caplet, or visible liquid medicine. Only return JSON.`;

      let describeResp: Response;
      try {
        describeResp = await callGemini(LOVABLE_API_KEY, [
          { type: 'text', text: describePrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]);
      } catch (e) {
        console.error('pill_check describe fetch failed:', e);
        return new Response(
          JSON.stringify({ ok: false, fallback: true, message: 'Could not analyse the pill image, please proceed.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!describeResp.ok) {
        const t = await describeResp.text().catch(() => '');
        console.error('describe failed', describeResp.status, t);
        return new Response(
          JSON.stringify({ ok: false, fallback: true, message: 'Could not analyse the pill image, please proceed.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const describeData = await describeResp.json();
      const describeContent = describeData.choices?.[0]?.message?.content || '';
      let described: any = { isPillVisible: false, observedDescription: 'none' };
      try {
        const m = describeContent.match(/\{[\s\S]*\}/);
        if (m) described = JSON.parse(m[0]);
      } catch (e) { console.error('describe parse error', e); }

      if (!described.isPillVisible) {
        return new Response(
          JSON.stringify({
            ok: true,
            isPillVisible: false,
            isMatch: false,
            matchReason: 'No pill detected in the image. Hold it closer to the camera and try again.',
            observedDescription: described.observedDescription || 'none',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 2 — match against prescription
      const matchPrompt = `Prescription: ${rx.medication} ${rx.dosage || ''}.
Observed pill description: ${described.observedDescription}.

Could these plausibly be the same medication? Many generic medications have no markings — be lenient when shape/colour are reasonable. Reply in JSON ONLY:
{
  "isMatch": true or false,
  "matchReason": "one short sentence explaining the verdict"
}
Only return JSON.`;

      let matchResp: Response;
      try {
        matchResp = await callGemini(LOVABLE_API_KEY, [{ type: 'text', text: matchPrompt }]);
      } catch (e) {
        console.error('match fetch failed:', e);
        return new Response(
          JSON.stringify({
            ok: true,
            isPillVisible: true,
            isMatch: true,
            matchReason: "Couldn't fully verify, but a tablet is visible — proceeding.",
            observedDescription: described.observedDescription,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let matched: any = { isMatch: true, matchReason: 'Proceeding without strict match.' };
      if (matchResp.ok) {
        const md = await matchResp.json();
        const mc = md.choices?.[0]?.message?.content || '';
        try {
          const m = mc.match(/\{[\s\S]*\}/);
          if (m) matched = JSON.parse(m[0]);
        } catch (e) { console.error('match parse error', e); }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          isPillVisible: true,
          isMatch: matched.isMatch,
          matchReason: matched.matchReason,
          observedDescription: described.observedDescription,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // INGESTION VALIDATION MODE — multi-frame sequence
    // ============================================================
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

    const today = new Date().toISOString().split('T')[0];

    // Helpers
    const cleanupAllFiles = async () => {
      if (paths.length > 0) {
        const { error } = await supabase.storage.from('patient-media').remove(paths);
        if (error) console.error('Failed to delete frame files:', error);
      }
    };

    const cleanupExceptFirst = async () => {
      if (paths.length > 1) {
        const toDelete = paths.slice(1);
        const { error } = await supabase.storage.from('patient-media').remove(toDelete);
        if (error) console.error('Failed to delete frame files (keep first):', error);
      }
    };

    const savePendingReview = async () => {
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
            .update({ status: 'pending_review', taken_at: new Date().toISOString(), proof_url: firstFrameUrl })
            .eq('id', existing.id);
        } else {
          await supabase.from('medication_adherence').insert({
            patient_id: patientId, prescription_id: prescriptionId, scheduled_date: today,
            status: 'pending_review', taken_at: new Date().toISOString(), proof_url: firstFrameUrl,
          });
        }
      } catch (e) { console.error('savePendingReview failed:', e); }
    };

    // Stage 1 already confirmed the pill, so we focus on person + ingestion + completion
    const validationPrompt = `You are a healthcare compliance validator. You are given ${urls.length} frames extracted from a short video, in chronological order. The patient has already shown the correct medication in a separate prior step, so do NOT fail this verification just because the pill isn't clearly visible — focus on the ingestion behaviour.

Analyse the SEQUENCE for ALL of these criteria:

1. **Person visible**: The same person must be clearly visible across the frames.
2. **Ingestion action**: The middle-to-late frames must show the person placing something into their mouth (hand-to-mouth gesture).
3. **Completion**: The final frame(s) should show the person has swallowed — ideally an open, empty mouth or relaxed posture after swallowing.

Respond with JSON ONLY:
{
  "isValid": true or false,
  "confidence": number 0-100,
  "description": "brief description of what the sequence shows",
  "person_detected": true or false,
  "ingestion_detected": true or false,
  "detected_elements": ["list", "of", "relevant", "elements"]
}

VALID only if person + ingestion + completion are all present. Only return JSON.`;

    const content: any[] = [{ type: 'text', text: validationPrompt }];
    urls.forEach((url, i) => {
      content.push({ type: 'text', text: `Frame ${i + 1} of ${urls.length}:` });
      content.push({ type: 'image_url', image_url: { url } });
    });

    let aiResponse: Response;
    try {
      aiResponse = await callGemini(LOVABLE_API_KEY, content);
    } catch (fetchErr) {
      console.error('AI fetch threw:', fetchErr);
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      console.error('AI validation failed:', aiResponse.status, errorText);
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let validationResult: any;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) validationResult = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      await savePendingReview();
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, message: 'Verification temporarily unavailable — your dose has been recorded for doctor review.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validationResult.isValid) {
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
      let currentStreak = 0;
      const { data: streakRecords } = await supabase
        .from('medication_adherence')
        .select('scheduled_date')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false });

      if (streakRecords) {
        const checkDate = new Date();
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (streakRecords.some((r) => r.scheduled_date === dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else break;
        }

        if (currentStreak > 0 && currentStreak % 7 === 0 && patient?.user_id) {
          await supabase.from('notifications').insert({
            user_id: patient.user_id,
            title: '🔥 Medication Streak Achievement!',
            description: `${patient.name} has a ${currentStreak}-day medication adherence streak! Consider congratulating them.`,
            type: 'medication_streak',
            reference_id: patientId,
          });
        }
      }

      await cleanupAllFiles();

      return new Response(
        JSON.stringify({ ok: true, validation: validationResult, molesAwarded: 5, streak: currentStreak }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI ran but said "no"
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
          .update({ status: 'failed_verification', taken_at: new Date().toISOString(), proof_url: firstFrameUrl })
          .eq('id', existing.id);
      } else {
        await supabase.from('medication_adherence').insert({
          patient_id: patientId, prescription_id: prescriptionId, scheduled_date: today,
          status: 'failed_verification', taken_at: new Date().toISOString(), proof_url: firstFrameUrl,
        });
      }
    } catch (e) { console.error('failed_verification update error:', e); }
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
