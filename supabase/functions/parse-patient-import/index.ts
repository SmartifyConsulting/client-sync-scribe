import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedPatient {
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  physical_address?: string;
  postal_address?: string;
  medical_aid?: string;
  medical_aid_number?: string;
  medical_insurance_product?: string;
  allergies?: string;
  employer?: string;
  occupation?: string;
  referred_by?: string;
  general_practitioner?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  notes?: string;
  id_passport_number?: string;
  gender?: string;
  marital_status?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication — handles patient PII
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content : null;
    const fileType = typeof body?.fileType === "string" ? body.fileType : "txt";

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (content.length > 500_000) {
      return new Response(
        JSON.stringify({ error: "content exceeds maximum size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a medical data extraction specialist. Your task is to parse patient information from various formats (text notes, CSV data, spreadsheet data) and extract structured patient records.

Extract the following fields where available:
- name (REQUIRED - full name of the patient)
- email (email address)
- phone (phone/mobile/cell number)
- dob (date of birth - format as YYYY-MM-DD)
- physical_address (residential/physical address)
- postal_address (mailing/postal address)
- medical_aid (medical insurance provider name)
- medical_aid_number (membership/policy number)
- medical_insurance_product (plan/option name)
- allergies (known allergies)
- employer (employer/company name)
- occupation (job title/profession)
- referred_by (referral source)
- general_practitioner (GP/family doctor name)
- next_of_kin_name (emergency contact name)
- next_of_kin_phone (emergency contact phone)
- next_of_kin_email (emergency contact email)
- notes (additional notes/comments)
- id_passport_number (ID or passport number)
- gender (Male/Female/Other)
- marital_status (Single/Married/Divorced/Widowed)

Rules:
1. Each patient must have at least a name
2. Parse dates in YYYY-MM-DD format
3. Clean phone numbers (keep only digits and + prefix)
4. Be flexible with field names in the input (e.g., "Tel", "Mobile", "Cell" all mean phone)
5. If multiple patients are in the data, return all of them
6. Skip empty or invalid records
7. Combine first name and last name into "name" if provided separately

Return ONLY a valid JSON array of patient objects. No explanations, no markdown, just the JSON array.`;

    const userPrompt = `Parse the following ${fileType === 'txt' ? 'text/notepad' : 'data'} content and extract patient records:

${content}

Return a JSON array of patient objects with the fields described. Each patient MUST have a "name" field.`;

    console.log("Calling Lovable AI to parse patient data...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", aiContent);

    // Parse the JSON response
    let patients: ParsedPatient[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let jsonStr = aiContent.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        patients = parsed.filter((p: any) => p && typeof p.name === 'string' && p.name.trim());
      } else if (parsed && typeof parsed.name === 'string') {
        patients = [parsed];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      throw new Error("Could not parse AI response as JSON");
    }

    console.log(`Successfully parsed ${patients.length} patients`);

    return new Response(
      JSON.stringify({ patients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in parse-patient-import:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
