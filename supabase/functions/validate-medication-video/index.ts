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
    // BASELINE TABLET CHECK — quick AI check that markings are visible
    // ============================================================
    if (body.mode === 'baseline_tablet_check') {
      const { imageUrl, expectedQuantity } = body;
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Missing imageUrl' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const expectedQty = Number(expectedQuantity) > 0 ? Number(expectedQuantity) : 1;
      const prompt = `Look at this close-up photo of a tablet/capsule. Reply in JSON ONLY:
{
  "markingsVisible": true or false,
  "tabletCount": integer (number of distinct tablets/capsules visible),
  "suggestion": "if markingsVisible is false, give one short sentence telling the patient how to retake (e.g. flip the tablet, get closer). If true, empty string."
}
Markings means any printed letters, numbers, brand logo or scored line. A plain unmarked tablet still counts as markingsVisible=false. Only return JSON.`;
      let markingsVisible = true;
      let tabletCount = expectedQty;
      let suggestion = '';
      try {
        const r = await callGemini(LOVABLE_API_KEY, [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]);
        if (r.ok) {
          const d = await r.json();
          const c = d.choices?.[0]?.message?.content || '';
          const m = c.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            markingsVisible = parsed.markingsVisible !== false;
            if (typeof parsed.tabletCount === 'number') tabletCount = Math.max(0, Math.floor(parsed.tabletCount));
            suggestion = parsed.suggestion || '';
          }
        }
      } catch (e) {
        console.error('baseline_tablet_check failed', e);
      }
      if (tabletCount < expectedQty && markingsVisible) {
        suggestion = `We only saw ${tabletCount} of ${expectedQty} tablets — show them all together.`;
        markingsVisible = false;
      }
      return new Response(JSON.stringify({ ok: true, markingsVisible, tabletCount, expectedQuantity: expectedQty, suggestion }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============================================================
    // BASELINE CAPTURE — full first-dose video (frames only)
    // Persists tablet description + ingestion-pattern summary
    // ============================================================
    if (body.mode === 'baseline_capture') {
      const {
        packagingImageUrl,
        closeupImageUrl,
        sequenceImageUrls,
        sequenceFilePaths,
        intakeMethod,
        prescriptionId,
        expectedMedication,
        expectedDosage,
        expectedQuantity,
      } = body;
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

      const expectedMed = (expectedMedication || rx.medication || '').toString();
      const expectedDose = (expectedDosage || rx.dosage || '').toString();
      const expectedQty = Number.isFinite(Number(expectedQuantity)) && Number(expectedQuantity) > 0 ? Number(expectedQuantity) : 1;

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

      // 1b) OCR the packaging and check it matches the prescription
      let packagingMatch: { ok: boolean; detectedMedication?: string; detectedStrength?: string; message?: string } | null = null;
      if (packagingImageUrl) {
        const packPrompt = `You are reading the packaging of a medication. The patient's prescription says:
- Medication: "${expectedMed}"
- Strength/Dosage: "${expectedDose}"

Read the visible text on the packaging in this image (box, blister, bottle label).
Reply in JSON ONLY:
{
  "detectedMedication": "brand or generic name as printed (or empty string)",
  "detectedStrength": "strength as printed e.g. 50mg, 100mg (or empty string)",
  "matchesPrescription": true or false,
  "reason": "one short sentence — if it doesn't match, name what looks different"
}
Be lenient: a match is ok if the medication name (brand or generic) and strength are clearly the same product, even if formatting differs. Only return JSON.`;
        try {
          const packResp = await callGemini(LOVABLE_API_KEY, [
            { type: 'text', text: packPrompt },
            { type: 'image_url', image_url: { url: packagingImageUrl } },
          ]);
          if (packResp.ok) {
            const pd = await packResp.json();
            const pc = pd.choices?.[0]?.message?.content || '';
            const m = pc.match(/\{[\s\S]*\}/);
            if (m) {
              const parsed = JSON.parse(m[0]);
              const ok = !!parsed.matchesPrescription;
              packagingMatch = {
                ok,
                detectedMedication: parsed.detectedMedication || '',
                detectedStrength: parsed.detectedStrength || '',
                message: ok
                  ? undefined
                  : `This looks like ${parsed.detectedMedication || 'an unknown medicine'} ${parsed.detectedStrength || ''} but your prescription says ${expectedMed} ${expectedDose}. ${parsed.reason || ''}`.trim(),
              };
            }
          }
        } catch (e) {
          console.error('baseline packaging OCR failed', e);
        }
      }

      // 2) Summarise the ingestion sequence
      let baselinePatternSummary = '';
      const seqUrls: string[] = Array.isArray(sequenceImageUrls) ? sequenceImageUrls : [];
      if (seqUrls.length > 0) {
        const patternPrompt = `You are observing a patient's first-dose baseline for ${rx.medication} (${rx.dosage || ''}). Their declared intake method is "${intakeMethod}" and they are taking ${expectedQty} tablet(s) per dose. Summarise their ingestion routine across these ${seqUrls.length} chronological frames in 1-2 sentences for later pattern matching. Note hand used, body posture, presence of water/liquid/spoon, and timing cues. Reply in JSON ONLY:
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

      // 3) Persist the row (now includes packaging_image_url)
      await supabase.from('prescription_pill_references').upsert(
        {
          prescription_id: prescriptionId,
          patient_id: rx.patient_id,
          reference_image_url: closeupImageUrl,
          packaging_image_url: packagingImageUrl || null,
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
        JSON.stringify({ ok: true, observedDescription, baselinePatternSummary, packagingMatch }),
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

      const expectedQty = Number(body.expectedQuantity) > 0 ? Number(body.expectedQuantity) : 1;
      const matchPrompt = `Image A is the patient's REFERENCE photo of their prescribed medication (${rx.medication} ${rx.dosage || ''}).
Image B is the pill they're about to take RIGHT NOW. The patient is expected to take ${expectedQty} tablet(s).

Compare colour, shape, size, surface texture and any visible markings or score lines. Generic unmarked tablets only need to share colour and shape — be lenient on those. Pills with distinctive markings should match those markings. Also COUNT how many distinct tablets/capsules are visible in image B.

Reply in JSON ONLY:
{
  "isPillVisible": true or false,
  "isMatch": true or false,
  "confidence": number 0-100,
  "detectedTabletCount": integer,
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
          detectedTabletCount: typeof matched.detectedTabletCount === 'number' ? Math.max(0, Math.floor(matched.detectedTabletCount)) : null,
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

    // Determine if this is a vitamin/supplement (reduced Vula award)
    const { data: rxMeta } = await supabase
      .from('prescriptions')
      .select('source, approved_medication_id')
      .eq('id', prescriptionId)
      .maybeSingle();
    let isSupplement = false;
    if (rxMeta?.approved_medication_id) {
      const { data: appr } = await supabase
        .from('approved_daily_medications')
        .select('category')
        .eq('id', rxMeta.approved_medication_id)
        .maybeSingle();
      const cat = (appr?.category || '').toLowerCase();
      if (cat === 'vitamin' || cat === 'supplement') isSupplement = true;
    }
    const VULA_AWARD = isSupplement ? 2 : 5;

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

This clip covers TABLET ${tabletIdx} OF ${tabletTot} for this dose.

REQUIRED signals for this intake method: ${required}
DISQUALIFYING signals for this intake method: ${disqualifying}

A SWALLOW ACTION means jaw/throat movement, the head tilting back, OR the mouth visibly closing then relaxing across at least 2 frames after the tablet enters the mouth. For methods "swallow", "crush", "chew" and "dissolve" a swallow action MUST be observed — if you cannot see it, set swallowDetected=false and isValid=false.

Also COUNT the number of distinct tablets/capsules/pills visible in the close-up frames at any point during the clip. Return that integer in detectedTabletCount (0 if none visible).

Analyse the SEQUENCE and respond with JSON ONLY:
{
  "isValid": true or false,
  "confidence": number 0-100,
  "pattern_match_score": number 0-100,
  "description": "brief description of what the sequence shows. If swallow not detected, say so plainly.",
  "person_detected": true or false,
  "ingestion_detected": true or false,
  "swallowDetected": true or false,
  "chewingDetected": true or false,
  "disqualifying_signal": true or false,
  "detectedTabletCount": integer,
  "detected_elements": ["list", "of", "relevant", "elements"]
}

Set isValid=true only if person_detected AND ingestion_detected AND the required signals are present AND no disqualifying signal is observed AND (for swallow/crush/dissolve/chew) swallowDetected is true. Only return JSON.`;

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
    const detectedTabletCount = typeof validationResult.detectedTabletCount === 'number'
      ? Math.max(0, Math.floor(validationResult.detectedTabletCount))
      : 0;
    const hardFail = validationResult.disqualifying_signal === true && confidence >= 60;

    // ===== Multi-tablet sub-clips =====
    // For intermediate sub-clips of a multi-tablet dose, do NOT write the
    // adherence row, do NOT award Vulas. The client orchestrator combines
    // results and submits the final tablet to write the aggregate row.
    const isFinalSubmission = tabletIdx >= tabletTot;
    if (!isFinalSubmission) {
      // Always cleanup frames; we don't keep proof for sub-clips
      await cleanupAllFiles();
      return new Response(
        JSON.stringify({
          ok: true,
          subClip: true,
          tabletIndex: tabletIdx,
          tabletTotal: tabletTot,
          confidence,
          detectedTabletCount,
          validation: validationResult,
          hardFail,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate tablet counts across the dose. The client may also pass
    // accumulated counts (`accumulatedTabletCount`, `averageConfidence`),
    // but we always trust this clip's own detection as a baseline.
    const accumulatedTabletCount = typeof body.accumulatedTabletCount === 'number'
      ? Math.max(0, Math.floor(body.accumulatedTabletCount))
      : detectedTabletCount;
    const tabletDetected = Math.min(accumulatedTabletCount + detectedTabletCount - detectedTabletCount, tabletTot) || detectedTabletCount;
    const tabletDetectedFinal = Math.min(Math.max(accumulatedTabletCount, detectedTabletCount), tabletTot);
    const aggregateConfidence = typeof body.averageConfidence === 'number'
      ? Math.max(0, Math.min(100, body.averageConfidence))
      : confidence;

    const adherenceExtras = {
      confidence_score: aggregateConfidence,
      tablet_count_expected: tabletTot,
      tablet_count_detected: tabletDetectedFinal,
    };

    // Downgrade one tier if we detected fewer tablets than expected
    const shortfall = tabletTot > 1 && tabletDetectedFinal < tabletTot;
    const shortfallNote = shortfall
      ? `Only ${tabletDetectedFinal} of ${tabletTot} tablets detected on camera.`
      : null;

    // ===== Decision tree =====
    // Hard fail: locked, no Vulas
    if (hardFail) {
      await upsertAdherence('failed_verification', {
        ...adherenceExtras,
        ...(shortfallNote ? { reconciliation_note: shortfallNote } : {}),
      });
      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: true,
          validation: {
            ...validationResult,
            isValid: false,
            description: validationResult.description || 'The intake did not match your declared method. Please contact your doctor before changing how you take this medicine.',
          },
          confidence: aggregateConfidence,
          detectedTabletCount: tabletDetectedFinal,
          tabletExpected: tabletTot,
          molesAwarded: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confirmed: Vulas + completed (downgraded to provisional if tablet shortfall)
    if (validationResult.isValid && aggregateConfidence >= 75 && !shortfall) {
      await upsertAdherence('completed', adherenceExtras);

      const { data: patient } = await supabase
        .from('patients')
        .select('user_id, patient_user_id, name')
        .eq('id', patientId)
        .maybeSingle();

      if (patient?.patient_user_id) {
        await supabase.from('patient_rewards').insert({
          patient_id: patientId,
          awarded_by: patient.patient_user_id,
          lollipops_count: VULA_AWARD,
          visit_category: isSupplement ? 'Supplement Adherence' : 'Medication Adherence',
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
        JSON.stringify({
          ok: true,
          validation: validationResult,
          confidence: aggregateConfidence,
          detectedTabletCount: tabletDetectedFinal,
          tabletExpected: tabletTot,
          molesAwarded: VULA_AWARD,
          streak: currentStreak,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Provisional: 30-74 confidence OR tablet shortfall — Vulas paid now, reconciled at month-end
    if (aggregateConfidence >= 30) {
      await upsertAdherence('provisional', {
        ...adherenceExtras,
        ...(shortfallNote ? { reconciliation_note: shortfallNote } : {}),
      });

      const { data: patient } = await supabase
        .from('patients')
        .select('patient_user_id')
        .eq('id', patientId)
        .maybeSingle();

      if (patient?.patient_user_id) {
        await supabase.from('patient_rewards').insert({
          patient_id: patientId,
          awarded_by: patient.patient_user_id,
          lollipops_count: VULA_AWARD,
          visit_category: isSupplement ? 'Supplement Adherence' : 'Medication Adherence',
          reward_type: 'medication_adherence',
        });
      }

      await cleanupExceptFirst();
      return new Response(
        JSON.stringify({
          ok: true,
          provisional: true,
          confidence: aggregateConfidence,
          detectedTabletCount: tabletDetectedFinal,
          tabletExpected: tabletTot,
          validation: validationResult,
          molesAwarded: VULA_AWARD,
          message: shortfall
            ? `Only ${tabletDetectedFinal} of ${tabletTot} tablets seen on camera — provisional, reviewed at month-end.`
            : `Confidence ${Math.round(aggregateConfidence)}% — provisional. Will be confirmed at month-end if your average stays above 50%.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Too low: failed, no Vulas
    await upsertAdherence('failed_verification', {
      ...adherenceExtras,
      ...(shortfallNote ? { reconciliation_note: shortfallNote } : {}),
    });
    await cleanupExceptFirst();
    return new Response(
      JSON.stringify({
        ok: true,
        validation: validationResult,
        confidence: aggregateConfidence,
        detectedTabletCount: tabletDetectedFinal,
        tabletExpected: tabletTot,
        molesAwarded: 0,
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
