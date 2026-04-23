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

type IntakeMethod = 'swallow' | 'chew' | 'crush' | 'dissolve' | 'gummy';

function methodSignals(method: IntakeMethod | string | null): { required: string; disqualifying: string } {
  switch (method) {
    case 'chew':
      return {
        required: 'hand-to-mouth gesture, clear chewing motion across multiple frames, then swallow',
        disqualifying: 'tablet swallowed immediately with no chewing motion',
      };
    case 'crush':
      return {
        required: 'powder or visibly broken tablet present, consumed via spoon or mixed in food/liquid',
        disqualifying: 'a whole intact tablet placed directly into the mouth',
      };
    case 'dissolve':
      return {
        required: 'tablet placed in liquid (visible fizzing or stirring) and the liquid is then drunk',
        disqualifying: 'tablet placed directly into the mouth without dissolving first',
      };
    case 'gummy':
      return {
        required: 'hand-to-mouth gesture and chewing motion (chewing is expected)',
        disqualifying: 'none — chewing is the correct behaviour for a gummy',
      };
    case 'swallow':
    default:
      return {
        required: 'hand-to-mouth gesture and a swallow action (jaw/throat movement, relaxed posture afterwards)',
        disqualifying: 'repeated chewing motion suggesting the tablet was crushed by teeth',
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    // BASELINE CAPTURE — full first-dose video (frames only)
    // Persists tablet description + ingestion-pattern summary
    // ============================================================
    if (body.mode === 'baseline_capture') {
      const { closeupImageUrl, sequenceImageUrls, sequenceFilePaths, intakeMethod, prescriptionId } = body;
      if (!closeupImageUrl || !prescriptionId || !intakeMethod) {
        return new Response(
          JSON.stringify({ error: 'Missing closeupImageUrl, intakeMethod or prescriptionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: rx } = await supabase
        .from('prescriptions')
        .select('medication, dosage, patient_id')
        .eq('id', prescriptionId)
        .maybeSingle();
      if (!rx) {
        return new Response(
          JSON.stringify({ error: 'Prescription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1) Describe the tablet from the close-up
      const describePrompt = `You are a medication identification assistant. Describe the pill or medication shown in this reference image. Reply in JSON ONLY:
{
  "isPillVisible": true or false,
  "observedDescription": "describe colour, shape, size, surface texture, and any visible markings/text/score lines (or 'none' if no pill visible)"
}
Only return JSON.`;

      let observedDescription = '';
      try {
        const describeResp = await callGemini(LOVABLE_API_KEY, [
          { type: 'text', text: describePrompt },
          { type: 'image_url', image_url: { url: closeupImageUrl } },
        ]);
        if (describeResp.ok) {
          const dd = await describeResp.json();
          const dc = dd.choices?.[0]?.message?.content || '';
          const m = dc.match(/\{[\s\S]*\}/);
          if (m) observedDescription = JSON.parse(m[0]).observedDescription || '';
        }
      } catch (e) {
        console.error('baseline tablet describe failed', e);
      }

      // 2) Summarise the ingestion sequence
      let baselinePatternSummary = '';
      const seqUrls: string[] = Array.isArray(sequenceImageUrls) ? sequenceImageUrls : [];
      if (seqUrls.length > 0) {
        const patternPrompt = `You are observing a patient's first-dose baseline for ${rx.medication} (${rx.dosage || ''}). Their declared intake method is "${intakeMethod}". Summarise their ingestion routine across these ${seqUrls.length} chronological frames in 1-2 sentences for later pattern matching. Note hand used, body posture, presence of water/liquid/spoon, and timing cues. Reply in JSON ONLY:
{ "baselinePatternSummary": "..." }
Only return JSON.`;
        const content: any[] = [{ type: 'text', text: patternPrompt }];
        seqUrls.forEach((url, i) => {
          content.push({ type: 'text', text: `Frame ${i + 1}:` });
          content.push({ type: 'image_url', image_url: { url } });
        });
        try {
          const patternResp = await callGemini(LOVABLE_API_KEY, content);
          if (patternResp.ok) {
            const pd = await patternResp.json();
            const pc = pd.choices?.[0]?.message?.content || '';
            const m = pc.match(/\{[\s\S]*\}/);
            if (m) baselinePatternSummary = JSON.parse(m[0]).baselinePatternSummary || '';
          }
        } catch (e) {
          console.error('baseline pattern summary failed', e);
        }
      }

      // 3) Persist the row
      await supabase.from('prescription_pill_references').upsert(
        {
          prescription_id: prescriptionId,
          patient_id: rx.patient_id,
          reference_image_url: closeupImageUrl,
          observed_description: observedDescription || null,
          baseline_pattern_summary: baselinePatternSummary || null,
          intake_method: intakeMethod,
          medication_snapshot: rx.medication,
          dosage_snapshot: rx.dosage || '',
        },
        { onConflict: 'prescription_id' },
      );

      // 4) Cleanup sequence frames — we don't need them after extraction
      if (Array.isArray(sequenceFilePaths) && sequenceFilePaths.length > 0) {
        await supabase.storage.from('patient-media').remove(sequenceFilePaths).catch((e) => console.error('cleanup baseline frames', e));
      }

      return new Response(
        JSON.stringify({ ok: true, observedDescription, baselinePatternSummary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // PILL CHECK MODE — compare current image to reference image
    // (skipped client-side for crush/dissolve methods)
    // ============================================================
    if (body.mode === 'pill_check') {
      const { imageUrl, prescriptionId } = body;
      if (!imageUrl || !prescriptionId) {
        return new Response(
          JSON.stringify({ error: 'Missing imageUrl or prescriptionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      const { data: ref } = await supabase
        .from('prescription_pill_references')
        .select('reference_image_url, observed_description, intake_method, baseline_pattern_summary, medication_snapshot, dosage_snapshot')
        .eq('prescription_id', prescriptionId)
        .maybeSingle();

      if (!ref || !ref.reference_image_url || !ref.intake_method || !ref.baseline_pattern_summary) {
        return new Response(
          JSON.stringify({
            ok: true,
            requiresBaseline: true,
            reason: 'No baseline on file. Please record a baseline video first.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const medChanged = (ref.medication_snapshot || '').trim().toLowerCase() !== (rx.medication || '').trim().toLowerCase();
      const dosChanged = (ref.dosage_snapshot || '').trim().toLowerCase() !== (rx.dosage || '').trim().toLowerCase();
      if (medChanged || dosChanged || !ref.observed_description) {
        return new Response(
          JSON.stringify({
            ok: true,
            requiresBaseline: true,
            reason: 'Medication updated — please record a new baseline video.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Crush / dissolve methods don't have a meaningful intact-tablet frame
      if (ref.intake_method === 'crush' || ref.intake_method === 'dissolve') {
        return new Response(
          JSON.stringify({ ok: true, skip: true, reason: 'Pill check skipped for this intake method.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const matchPrompt = `Image A is the patient's REFERENCE photo of their prescribed medication (${rx.medication} ${rx.dosage || ''}).
Image B is the pill they're about to take RIGHT NOW.

Compare colour, shape, size, surface texture and any visible markings or score lines. Generic unmarked tablets only need to share colour and shape — be lenient on those. Pills with distinctive markings should match those markings.

Reply in JSON ONLY:
{
  "isPillVisible": true or false,
  "isMatch": true or false,
  "confidence": number 0-100,
  "matchReason": "one short sentence explaining the verdict"
}
Only return JSON.`;

      let matchResp: Response;
      try {
        matchResp = await callGemini(LOVABLE_API_KEY, [
          { type: 'text', text: matchPrompt },
          { type: 'text', text: 'Image A — reference:' },
          { type: 'image_url', image_url: { url: ref.reference_image_url } },
          { type: 'text', text: 'Image B — current pill:' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]);
      } catch (e) {
        console.error('pill_check compare fetch failed:', e);
        return new Response(
          JSON.stringify({
            ok: true,
            isPillVisible: true,
            isMatch: true,
            matchReason: "Couldn't fully verify, proceeding.",
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let matched: any = { isPillVisible: true, isMatch: true, matchReason: 'Proceeding without strict match.' };
      if (matchResp.ok) {
        const md = await matchResp.json();
        const mc = md.choices?.[0]?.message?.content || '';
        try {
          const m = mc.match(/\{[\s\S]*\}/);
          if (m) matched = JSON.parse(m[0]);
        } catch (e) { console.error('match parse error', e); }
      }

      if (!matched.isPillVisible) {
        return new Response(
          JSON.stringify({
            ok: true,
            isPillVisible: false,
            isMatch: false,
            matchReason: 'No pill detected. Hold it closer to the camera and try again.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          isPillVisible: true,
          isMatch: !!matched.isMatch,
          confidence: matched.confidence ?? null,
          matchReason: matched.matchReason || (matched.isMatch
            ? "Matches your reference pill."
            : "This doesn't look like your usual pill — please double-check before taking it."),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // INGESTION VALIDATION MODE — method-aware confidence scoring
    // ============================================================
    const { imageUrls, filePaths, prescriptionId, patientId, tabletIndex, tabletTotal } = body;
    const tabletIdx = Number.isFinite(Number(tabletIndex)) && Number(tabletIndex) > 0 ? Number(tabletIndex) : 1;
    const tabletTot = Number.isFinite(Number(tabletTotal)) && Number(tabletTotal) > 0 ? Number(tabletTotal) : 1;

    const urls: string[] = imageUrls || (body.videoUrl ? [body.videoUrl] : []);
    const paths: string[] = filePaths || (body.filePath ? [body.filePath] : []);

    if (urls.length === 0 || !prescriptionId || !patientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrls/videoUrl, prescriptionId, patientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Look up baseline (intake method + pattern summary) for tailored prompting
    const { data: ref } = await supabase
      .from('prescription_pill_references')
      .select('intake_method, observed_description, baseline_pattern_summary')
      .eq('prescription_id', prescriptionId)
      .maybeSingle();

    const intakeMethod = (ref?.intake_method as IntakeMethod) || 'swallow';
    const { required, disqualifying } = methodSignals(intakeMethod);

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

    const upsertAdherence = async (status: string, extras: Record<string, any> = {}) => {
      const firstFrameUrl = urls[0] || null;
      const { data: existing } = await supabase
        .from('medication_adherence')
        .select('id')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .eq('scheduled_date', today)
        .maybeSingle();
      const payload: Record<string, any> = {
        status,
        taken_at: new Date().toISOString(),
        proof_url: status === 'completed' ? null : firstFrameUrl,
        ...extras,
      };
      if (existing?.id) {
        await supabase.from('medication_adherence').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('medication_adherence').insert({
          patient_id: patientId, prescription_id: prescriptionId, scheduled_date: today,
          ...payload,
        });
      }
    };

    const validationPrompt = `You are a healthcare compliance validator. You are given ${urls.length} frames extracted from a short video, in chronological order.

The patient's declared intake method is: "${intakeMethod}".
${ref?.observed_description ? `Tablet baseline description: ${ref.observed_description}` : ''}
${ref?.baseline_pattern_summary ? `Patient's baseline routine: ${ref.baseline_pattern_summary}` : ''}

REQUIRED signals for this intake method: ${required}
DISQUALIFYING signals for this intake method: ${disqualifying}

Analyse the SEQUENCE and respond with JSON ONLY:
{
  "isValid": true or false,
  "confidence": number 0-100,
  "pattern_match_score": number 0-100,
  "description": "brief description of what the sequence shows",
  "person_detected": true or false,
  "ingestion_detected": true or false,
  "disqualifying_signal": true or false,
  "detected_elements": ["list", "of", "relevant", "elements"]
}

Set isValid=true only if person_detected AND ingestion_detected AND the required signals are present AND no disqualifying signal is observed. Set confidence based on overall certainty. Only return JSON.`;

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
      await upsertAdherence('provisional', { confidence_score: null });
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: 'ai_unavailable', message: 'Verification temporarily unavailable — your dose has been recorded for end-of-month review.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      console.error('AI validation failed:', aiResponse.status, errorText);
      await upsertAdherence('provisional', { confidence_score: null });
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: 'ai_unavailable', message: 'Verification temporarily unavailable — your dose has been recorded for end-of-month review.' }),
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
      await upsertAdherence('provisional', { confidence_score: null });
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: 'parse_error', message: 'Verification temporarily unavailable — your dose has been recorded for end-of-month review.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const confidence = typeof validationResult.confidence === 'number'
      ? Math.max(0, Math.min(100, validationResult.confidence))
      : 0;
    const hardFail = validationResult.disqualifying_signal === true && confidence >= 60;

    // ===== Decision tree =====
    // Hard fail: locked, no Vulas
    if (hardFail) {
      await upsertAdherence('failed_verification', { confidence_score: confidence });
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: true,
          validation: {
            ...validationResult,
            isValid: false,
            description: validationResult.description || 'The intake did not match your declared method. Please contact your doctor before changing how you take this medicine.',
          },
          confidence,
          molesAwarded: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confirmed: Vulas + completed
    if (validationResult.isValid && confidence >= 75) {
      await upsertAdherence('completed', { confidence_score: confidence });

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

      let currentStreak = 0;
      const { data: streakRecords } = await supabase
        .from('medication_adherence')
        .select('scheduled_date')
        .eq('patient_id', patientId)
        .eq('prescription_id', prescriptionId)
        .in('status', ['completed', 'provisional'])
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
        JSON.stringify({ ok: true, validation: validationResult, confidence, molesAwarded: 5, streak: currentStreak }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Provisional: 30-74 confidence — Vulas paid now, reconciled at month-end
    if (confidence >= 30) {
      await upsertAdherence('provisional', { confidence_score: confidence });

      const { data: patient } = await supabase
        .from('patients')
        .select('patient_user_id')
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

      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: true,
          provisional: true,
          confidence,
          validation: validationResult,
          molesAwarded: 5,
          message: `Confidence ${Math.round(confidence)}% — provisional. Will be confirmed at month-end if your average stays above 50%.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Too low: failed, no Vulas
    await upsertAdherence('failed_verification', { confidence_score: confidence });
    await cleanupExceptFirst();
    return new Response(
      JSON.stringify({ ok: true, validation: validationResult, confidence, molesAwarded: 0 }),
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
