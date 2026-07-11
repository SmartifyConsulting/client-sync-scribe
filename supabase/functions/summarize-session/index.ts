import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log("summarize-session function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    console.log("Request body received:", JSON.stringify(body).substring(0, 200));
    
    const { notes, transcript, action, text, targetLanguage, language, clientDate, clientTimezone } = body;

    // Resolve "today" from the caller's local calendar so AI-extracted dates
    // (e.g. "until Monday") don't drift off-by-one due to UTC truncation.
    const today = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
      ? clientDate
      : new Date().toISOString().split("T")[0];
    const localDow = (() => {
      try {
        return new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          timeZone: clientTimezone || "UTC",
        }).format(new Date(`${today}T12:00:00Z`));
      } catch { return ""; }
    })();

    // Handle translation request
    if (action === 'translate' && text && targetLanguage) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const translationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `You are a professional medical translator. Translate the following medical summary to ${targetLanguage}. Preserve all medical terminology accuracy. Return ONLY the translated text, no explanations.` },
            { role: "user", content: text },
          ],
        }),
      });

      if (!translationResponse.ok) {
        const errText = await translationResponse.text();
        console.error("Translation API error:", translationResponse.status, errText);
        throw new Error("Translation API error");
      }

      const translationData = await translationResponse.json();
      const translatedText = translationData.choices?.[0]?.message?.content || text;

      return new Response(
        JSON.stringify({ translatedText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!notes && !transcript) {
      console.log("No notes or transcript provided");
      return new Response(
        JSON.stringify({ error: "Notes or transcript required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const content = transcript || notes;
    console.log("Processing content for summary, length:", content?.length);
    
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
            content: `You are a professional medical/clinical assistant that creates detailed session summaries and detects clinical documents discussed in the session.${language ? `\n\nIMPORTANT: Respond entirely in ${language}. All summaries, action points, and extracted document content must be written in ${language}.` : ''}

Your task is to analyze the session transcript or notes and provide:
1. A comprehensive professional summary (2-4 sentences)
2. A list of specific, actionable action points/tasks
3. Detect if any of the following were discussed and extract relevant data:
   - **Medical Certificate / Sick Note / Leave of Absence**: If the doctor discusses issuing a medical certificate, sick leave, or leave of absence, extract the details.
   - **Prescription**: If medications are prescribed or discussed for the patient, extract medication details.
   - **Invoice / Billing**: If billing, fees, or invoice amounts are discussed, extract the details.
   - **Referral Letter**: If a referral to another specialist or doctor is discussed, extract the details.
   - **Patient Tasks / Exercises**: If exercises, homework, lifestyle changes, or daily tasks are assigned to the patient, extract each task with title, description, frequency, and suggested vulas reward (1-5).

IMPORTANT GUIDELINES:
- Actually read and analyze the transcript content thoroughly
- Extract REAL action points mentioned in the conversation
- For medical certificates: extract patient_name, start_date, end_date, reason/diagnosis. Leave end-date rules: "until <weekday>" or "until <date>" → end_date is THAT day inclusive (the last day the patient is absent). "for N days" starting today → end_date = today + (N-1) days. "back at work on Tuesday" → end_date = the Monday before. Never set end_date earlier than start_date.
- For prescriptions: extract each medication with name, dosage, frequency, duration, instructions
- For invoices: extract service descriptions and amounts
- For referrals: extract specialist_type, doctor_name (if mentioned), reason, urgency
- For follow-up appointment: if the doctor and patient agree on a next-visit date OR the patient says when they want to be seen again, extract the follow-up. ALWAYS return follow_up_date as an ISO calendar date (YYYY-MM-DD). If both an explicit calendar date (e.g. "the 23rd of July") AND a relative phrase ("in two weeks") appear, PREFER THE EXPLICIT CALENDAR DATE. If only a relative phrase is given ("in two weeks", "next Tuesday"), resolve it against today's local date below. Extract follow_up_time as HH:MM (24h) if a time is stated; otherwise omit.
- Only include a document type if it was CLEARLY discussed in the session
- Dates should be in YYYY-MM-DD format when possible
- Today is ${localDow ? localDow + ", " : ""}${today}${clientTimezone ? ` (${clientTimezone})` : ""}. Resolve "today", "tomorrow", weekday names (e.g. "until Monday"), and partial dates like "3 July" against this local calendar date. NEVER shift the user's spoken date by a day to convert to UTC.
- Weekday names refer to the NEXT occurrence of that weekday on or after today.

Respond using the provided tool/function schema.`,
          },
          {
            role: "user",
            content: `Please analyze this session content thoroughly and provide a detailed summary with specific action points, and detect any clinical documents discussed:\n\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_session_summary",
              description: "Generate a professional summary, action points, and detect clinical documents from session transcript",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive professional summary of the session (2-4 sentences)",
                  },
                  action_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of specific, actionable tasks extracted from the session",
                  },
                  medical_certificate: {
                    type: "object",
                    description: "Medical certificate details if discussed. Null/omit if not discussed.",
                    properties: {
                      patient_name: { type: "string" },
                      diagnosis: { type: "string", description: "Reason for leave / diagnosis" },
                      start_date: { type: "string", description: "Start date of leave (YYYY-MM-DD)" },
                      end_date: { type: "string", description: "End date of leave (YYYY-MM-DD)" },
                      notes: { type: "string", description: "Additional notes" },
                    },
                    required: ["diagnosis", "start_date", "end_date"],
                  },
                  prescription: {
                    type: "object",
                    description: "Prescription details if medications were discussed. Null/omit if not discussed.",
                    properties: {
                      medications: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            medication: { type: "string" },
                            dosage: { type: "string" },
                            frequency: { type: "string" },
                            duration: { type: "string" },
                            instructions: { type: "string" },
                            repeats: { type: "string", description: "Number of repeats or repeat instructions if mentioned, e.g. 'x3', 'Repeat x2'" },
                          },
                          required: ["medication", "dosage", "frequency"],
                        },
                      },
                    },
                    required: ["medications"],
                  },
                  invoice: {
                    type: "object",
                    description: "Invoice details if billing was discussed. Null/omit if not discussed.",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            description: { type: "string" },
                            amount: { type: "number" },
                          },
                          required: ["description", "amount"],
                        },
                      },
                      total: { type: "number" },
                    },
                    required: ["items"],
                  },
                  referral: {
                    type: "object",
                    description: "Referral details if a referral was discussed. Null/omit if not discussed.",
                    properties: {
                      specialist_type: { type: "string" },
                      doctor_name: { type: "string" },
                      reason: { type: "string" },
                      urgency: { type: "string", description: "routine, urgent, or emergency" },
                    },
                    required: ["specialist_type", "reason"],
                  },
                  hospital_admission: {
                    type: "object",
                    description: "Hospital admission details if admission/hospitalization was discussed. Null/omit if not discussed.",
                    properties: {
                      diagnosis: { type: "string", description: "Primary diagnosis for admission" },
                      procedure: { type: "string", description: "Planned procedure or surgery" },
                      admission_date: { type: "string", description: "Planned admission date (YYYY-MM-DD)" },
                      hospital_name: { type: "string", description: "Hospital name if mentioned" },
                      special_instructions: { type: "string", description: "Pre-admission or special instructions" },
                    },
                    required: ["diagnosis"],
                  },
                  patient_tasks: {
                    type: "object",
                    description: "Patient task assignments (exercises, homework, lifestyle changes) if discussed. Null/omit if not discussed.",
                    properties: {
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Short task title" },
                            description: { type: "string", description: "Detailed task description" },
                            frequency: { type: "string", description: "How often (e.g., daily, twice daily, weekly)" },
                            vulas_reward: { type: "number", description: "Suggested vulas reward 1-5" },
                          },
                          required: ["title", "description"],
                        },
                      },
                    },
                    required: ["tasks"],
                  },
                },
                required: ["summary", "action_points"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_session_summary" } },
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
    console.log("AI response received");
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log("Summary generated:", result.summary?.substring(0, 100) + "...");
      console.log("Action points:", result.action_points?.length);
      console.log("Medical certificate detected:", !!result.medical_certificate);
      console.log("Prescription detected:", !!result.prescription);
      console.log("Invoice detected:", !!result.invoice);
      console.log("Referral detected:", !!result.referral);
      console.log("Hospital admission detected:", !!result.hospital_admission);
      console.log("Patient tasks detected:", !!result.patient_tasks);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content_response = data.choices?.[0]?.message?.content;
    if (content_response) {
      try {
        const parsed = JSON.parse(content_response);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({ summary: content_response, action_points: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    throw new Error("No valid response from AI");
  } catch (error) {
    console.error("summarize-session error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
