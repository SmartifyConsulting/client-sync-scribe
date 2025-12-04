import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patient, sessions } = await req.json();
    
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
      ?.map((s: any) => `- ${s.started_at}: ${s.summary || 'No summary available'}`)
      ?.join('\n') || 'No completed sessions yet.';

    const patientContext = `
Patient Name: ${patient.name}
Date of Birth: ${patient.dob || 'Unknown'}
Status: ${patient.status}
Patient Since: ${patient.created_at}
Medical Aid: ${patient.medical_aid || 'None'}
General Practitioner: ${patient.general_practitioner || 'Unknown'}
Occupation: ${patient.occupation || 'Unknown'}
Notes: ${patient.notes || 'None'}

Session History:
${sessionSummaries}
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
            content: `You are a professional medical/clinical assistant that creates comprehensive patient history summaries.

Your task is to analyze patient records and session history to provide:
1. A comprehensive narrative summary of the patient's history from first visit to present
2. A list of any medications mentioned (even if implied or discussed)
3. A list of any conditions, symptoms, or health concerns mentioned

IMPORTANT FORMATTING RULES:
- In the summary text, wrap ANY medication names with <med>medication name</med> tags
- In the summary text, wrap ANY conditions/symptoms with <condition>condition name</condition> tags
- Be thorough in identifying medications and conditions from the session notes

Example summary format:
"The patient presented with <condition>chronic back pain</condition> and was prescribed <med>ibuprofen</med> for pain management. Follow-up sessions addressed <condition>anxiety</condition> symptoms..."

Respond in JSON format:
{
  "summary": "Comprehensive narrative with <med> and <condition> tags inline",
  "medications": ["medication1", "medication2"],
  "conditions": ["condition1", "condition2"]
}`,
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
              description: "Generate a comprehensive patient history summary with highlighted medications and conditions",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive narrative summary with <med> tags around medications and <condition> tags around conditions",
                  },
                  medications: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of all medications mentioned",
                  },
                  conditions: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of all conditions/symptoms mentioned",
                  },
                },
                required: ["summary", "medications", "conditions"],
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
          JSON.stringify({ summary: content_response, medications: [], conditions: [] }),
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
