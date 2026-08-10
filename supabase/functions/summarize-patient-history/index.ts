import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller — processes PHI, must not be open.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { patient, sessions, language, historicalRecords } = await req.json();
    
    if (!patient) {
      return new Response(
        JSON.stringify({ error: "Patient data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from patient data and sessions
    const sessionSummaries = sessions
      ?.filter((s: any) => s.status === 'completed')
      ?.map((s: any) => `- Date: ${s.started_at} | Summary: ${s.summary || 'No summary available'} | Transcript: ${s.transcript || 'No transcript'}`)
      ?.join('\n') || 'No completed sessions yet.';

    const historicalContext = Array.isArray(historicalRecords) && historicalRecords.length > 0
      ? historicalRecords
          .map((r: any) => `- Record date: ${r.record_date || r.created_at || 'Unknown'} | ${r.name || 'Historical record'}: ${(r.content || '').slice(0, 4000)}`)
          .join('\n')
      : 'No historical paper records transcribed.';

    const patientContext = `
Patient Name: ${patient.name}
Date of Birth: ${patient.dob || 'Unknown'}
Status: ${patient.status}
Patient Since: ${patient.created_at}
Medical Aid: ${patient.medical_aid || 'None'}
General Practitioner: ${patient.general_practitioner || 'Unknown'}
Occupation: ${patient.occupation || 'Unknown'}
Notes: ${patient.notes || 'None'}
Allergies: ${patient.allergies || 'None recorded'}

Session History (with dates):
${sessionSummaries}

Retrospective / historical records (transcribed handwritten or paper notes — place these on the timeline by their record date, not by upload date):
${historicalContext}
`;

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
            content: `You are a professional medical/clinical assistant that creates comprehensive patient history summaries.${language ? `\n\nIMPORTANT: Respond entirely in ${language}. All summaries, symptoms, conditions, medications, allergies, and conflict descriptions must be written in ${language}.` : ''}

Your task is to analyze patient records and session history to provide:
1. A comprehensive narrative summary of the patient's history from first visit to present
2. A list of SYMPTOMS (temporary/recurring symptoms like headaches, fatigue, pain) with dates and status
3. A list of CONDITIONS (diagnosed illnesses/diseases like diabetes, hypertension, asthma) with dates and status
4. A list of MEDICATIONS mentioned with dates and whether currently in use
5. A list of known ALLERGIES
6. A list of MEDICATION CONFLICTS - any medications that may interact negatively with each other or with the patient's allergies

IMPORTANT DEFINITIONS:
- SYMPTOMS: Temporary or recurring physical/mental symptoms that come and go (headache, back pain, nausea, fatigue, dizziness, etc.)
- CONDITIONS: Named medical diagnoses, diseases, or chronic illnesses (diabetes, hypertension, asthma, arthritis, depression, etc.)
- MEDICATIONS: Any prescribed or discussed medications
- ALLERGIES: Known drug or other allergies
- CONFLICTS: Potential drug-drug interactions OR drug-allergy conflicts. Common conflicts include:
  * NSAIDs (ibuprofen, aspirin) with blood thinners (warfarin)
  * ACE inhibitors with potassium supplements
  * SSRIs with MAOIs
  * Medications containing substances the patient is allergic to
  * Statins with certain antibiotics
  * Opioids with benzodiazepines

IMPORTANT FORMATTING RULES:
- In the summary text, wrap ANY medication names with <med>medication name</med> tags
- In the summary text, wrap ANY symptoms with <symptom>symptom name</symptom> tags
- In the summary text, wrap ANY conditions with <condition>condition name</condition> tags
- For each array item, include status: "active" if currently present/in-use, "inactive" if resolved/not-in-use
- Extract dates from the session history provided
- If no specific date is available, use "Date unknown"
- ALWAYS check for medication conflicts, especially between currently active medications

IMPORTANT: In the summary text, prefix EACH timeline point with a date (e.g., "Jan 15, 2025 - Patient presented with..."). Every bullet/sentence should start with a date. If no specific date is available, use "Date unknown -".

Example summary format:
"Nov 12, 2024 - The patient presented with <symptom>chronic back pain</symptom> and was diagnosed with <condition>lumbar disc herniation</condition>. Nov 20, 2024 - They were prescribed <med>ibuprofen</med> for pain management..."

Respond in JSON format with the structure defined in the function parameters.`,
          },
          {
            role: "user",
            content: `Please analyze this patient's complete history and provide a comprehensive summary:\n\n${patientContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_patient_summary",
              description: "Generate a comprehensive patient history summary with symptoms, conditions, medications, and allergies",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive narrative summary with <med>, <symptom>, and <condition> tags",
                  },
                  symptoms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Symptom name (e.g., headache, back pain, fatigue)" },
                        date: { type: "string", description: "Date first reported (e.g., 'Nov 2024')" },
                        status: { type: "string", enum: ["active", "inactive"], description: "Current status" },
                      },
                      required: ["name", "date", "status"],
                    },
                    description: "List of symptoms (temporary/recurring physical or mental symptoms)",
                  },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Condition/disease name (e.g., diabetes, hypertension)" },
                        date: { type: "string", description: "Date diagnosed (e.g., 'Nov 2024')" },
                        status: { type: "string", enum: ["active", "inactive"], description: "Current status" },
                      },
                      required: ["name", "date", "status"],
                    },
                    description: "List of diagnosed conditions/diseases/illnesses",
                  },
                  medications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Medication name" },
                        date: { type: "string", description: "Date prescribed or discussed (e.g., 'Dec 2024')" },
                        status: { type: "string", enum: ["active", "inactive"], description: "Currently in use or not" },
                      },
                      required: ["name", "date", "status"],
                    },
                    description: "List of all medications with usage status",
                  },
                  allergies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Allergy name" },
                        severity: { type: "string", enum: ["mild", "moderate", "severe"], description: "Severity level" },
                      },
                      required: ["name", "severity"],
                    },
                    description: "List of known allergies",
                  },
                  conflicts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        medication1: { type: "string", description: "First medication or the medication causing conflict" },
                        medication2: { type: "string", description: "Second medication that conflicts with the first, or omit if allergy-related" },
                        reason: { type: "string", description: "Brief explanation of why these conflict (e.g., 'Increased bleeding risk', 'Patient allergic to penicillin derivatives')" },
                        severity: { type: "string", enum: ["low", "moderate", "high"], description: "Risk severity level" },
                      },
                      required: ["medication1", "reason", "severity"],
                    },
                    description: "List of potential medication conflicts or drug-allergy interactions",
                  },
                },
                required: ["summary", "symptoms", "conditions", "medications", "allergies", "conflicts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_patient_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    const content_response = data.choices?.[0]?.message?.content;
    if (content_response) {
      try {
        const parsed = JSON.parse(content_response);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({ summary: content_response, symptoms: [], conditions: [], medications: [], allergies: [], conflicts: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("summarize-patient-history error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
