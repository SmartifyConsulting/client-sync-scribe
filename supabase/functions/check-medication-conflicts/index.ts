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
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.86.0");
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { newMedication, currentMedications, allergies } = await req.json();

    if (!newMedication) {
      return new Response(
        JSON.stringify({ error: "New medication is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const medicationsList = currentMedications?.length > 0 
      ? currentMedications.map((m: any) => `- ${m.medication} (${m.dosage}, ${m.frequency})`).join('\n')
      : 'No current medications';

    const allergiesList = allergies || 'None known';

    const prompt = `Analyze this new medication for potential conflicts:

NEW MEDICATION BEING PRESCRIBED:
${newMedication}

PATIENT'S CURRENT MEDICATIONS:
${medicationsList}

PATIENT'S KNOWN ALLERGIES:
${allergiesList}

Check for:
1. Drug-drug interactions with current medications
2. Drug-allergy conflicts (if medication contains or is related to known allergens)
3. Contraindications based on common medical knowledge

If there are NO conflicts, return an empty conflicts array.
If there ARE conflicts, list each one with severity and explanation.`;

    console.log("Checking medication conflicts for:", newMedication);

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
            content: `You are a clinical pharmacology assistant that checks for medication conflicts and interactions. Be thorough but avoid false positives. Only flag genuine, clinically significant interactions. For each conflict found, provide:
- The medications involved
- The severity (low, moderate, high)
- A brief explanation of the interaction and potential consequences
- Recommended action (monitor, adjust dose, avoid combination, etc.)

IMPORTANT: Only report clinically significant interactions. Minor theoretical interactions that rarely cause problems should not be flagged.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_medication_conflicts",
              description: "Report any medication conflicts or interactions found",
              parameters: {
                type: "object",
                properties: {
                  hasConflicts: {
                    type: "boolean",
                    description: "Whether any conflicts were found",
                  },
                  conflicts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["drug-drug", "drug-allergy"],
                          description: "Type of conflict",
                        },
                        medication1: {
                          type: "string",
                          description: "The new medication being prescribed",
                        },
                        medication2: {
                          type: "string",
                          description: "The conflicting medication or allergen",
                        },
                        severity: {
                          type: "string",
                          enum: ["low", "moderate", "high"],
                          description: "Severity of the interaction",
                        },
                        explanation: {
                          type: "string",
                          description: "Brief explanation of the conflict",
                        },
                        recommendation: {
                          type: "string",
                          description: "Recommended action to take",
                        },
                      },
                      required: ["type", "medication1", "severity", "explanation", "recommendation"],
                    },
                    description: "List of conflicts found",
                  },
                },
                required: ["hasConflicts", "conflicts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_medication_conflicts" } },
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
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log("Conflict check result:", JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback - no conflicts found
    return new Response(
      JSON.stringify({ hasConflicts: false, conflicts: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-medication-conflicts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
