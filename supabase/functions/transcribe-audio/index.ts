import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Format transcript with speaker labels using AI
async function formatWithSpeakerLabels(rawText: string, patientName: string, doctorName: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.log("No LOVABLE_API_KEY, returning raw transcript");
      return rawText;
    }

    console.log("Formatting transcript with speaker labels...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a transcript formatter. Your task is to take a raw transcript and format it as a script-style dialogue with speaker labels.

Rules:
1. Identify different speakers based on context, speech patterns, and conversation flow
2. Label the doctor/practitioner as "${doctorName}:" and the patient as "${patientName}:"
3. Each speaker's turn should start on a new line with their label
4. Preserve all the original content - do not summarize or remove anything
5. If you cannot determine speaker changes, use your best judgment based on conversational flow
6. Add line breaks between speaker turns for readability
7. The patient's correct name is "${patientName}". Speech-to-text often mishears names — if the transcript body contains a phonetically similar variant or misspelling of this name (e.g. a different transliteration or a name that sounds alike but isn't a real dictionary word), correct it to "${patientName}" exactly, everywhere it appears in the text. Do not alter any other names, and don't "correct" a name that is clearly a different, unrelated person.`,
          },
          {
            role: "user",
            content: `Please format this transcript with speaker labels:\n\n${rawText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI formatting failed:", response.status);
      return rawText;
    }

    const data = await response.json();
    const formattedText = data.choices?.[0]?.message?.content;
    
    if (formattedText) {
      console.log("Successfully formatted transcript with speaker labels");
      return formattedText;
    }
    
    return rawText;
  } catch (error) {
    console.error("Error formatting transcript:", error);
    return rawText;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check using local JWT validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth failed:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { audio, audioUrl, patientName, doctorName, language, singleSpeaker } = await req.json();
    
    if (!audio && !audioUrl) {
      console.error('No audio data or URL provided');
      return new Response(
        JSON.stringify({ error: 'No audio data or URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Transcription service is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const patient = patientName || 'Patient';
    const doctor = doctorName || 'Doctor';

    const formData = new FormData();
    
    if (audioUrl) {
      // Download from private session-audio bucket using service role
      console.log('Downloading audio from session-audio bucket:', audioUrl);
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: blob, error: downloadError } = await admin.storage
          .from('session-audio')
          .download(audioUrl);
        if (downloadError || !blob) {
          console.error('Storage download failed:', downloadError);
          return new Response(
            JSON.stringify({ error: `Failed to fetch audio: ${downloadError?.message || 'Unknown'}`, fallback: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('Downloaded audio blob size:', blob.size);
        formData.append('file', blob, 'audio.webm');
      } catch (downloadErr) {
        console.error('Download exception:', downloadErr);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch audio from storage', fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Process base64 audio
      console.log('Processing base64 audio data, length:', audio.length);
      const binaryAudio = processBase64Chunks(audio);
      console.log('Binary audio size:', binaryAudio.length);
      const arrayBuffer = binaryAudio.buffer.slice(binaryAudio.byteOffset, binaryAudio.byteOffset + binaryAudio.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
    }
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    if (language) {
      formData.append('language', language);
      console.log('Using language:', language);
    }

    console.log('Sending to OpenAI Whisper API...');

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
    } catch (fetchErr) {
      console.error('OpenAI fetch failed:', fetchErr);
      return new Response(
        JSON.stringify({ error: 'Could not reach transcription service', fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Transcription failed (${response.status})`, fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Raw transcription successful');
    
    const rawText = result.text || '';

    // Single-speaker clips (e.g. patient SOS voice notes) skip the AI speaker-labeling round-trip
    // so responders see the transcript ~2–4s sooner and never get mis-labeled as "Responder".
    const formattedText = singleSpeaker
      ? (rawText ? `${patient}: ${rawText}` : '')
      : await formatWithSpeakerLabels(rawText, patient, doctor);

    return new Response(
      JSON.stringify({ text: formattedText, raw: rawText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, fallback: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
