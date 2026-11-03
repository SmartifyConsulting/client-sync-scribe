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
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

      const translationResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a professional translator. Translate the following consultation summary to ${targetLanguage}. Preserve financial terminology accuracy. Return ONLY the translated text, no explanations.` },
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const content = transcript || notes;
    console.log("Processing content for summary, length:", content?.length);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional financial-planning assistant that creates detailed consultation summaries for a Wealth Manager and their client.${language ? `\n\nIMPORTANT: Respond entirely in ${language}. All summaries and action points must be written in ${language}.` : ''}

Your task is to analyze the consultation transcript or notes and provide:
1. A comprehensive professional summary (2-4 sentences)
2. A list of specific, actionable action points/tasks
3. Detect if any of the following were discussed and extract relevant data:
   - **Invoice / Billing**: If billing, fees, or invoice amounts are discussed, extract the details.
   - **Client Tasks**: If homework, follow-up actions, or things the client should do are assigned, extract each task with title, description, frequency, and suggested vulas reward (1-5).
   - **Follow-up meeting**: If the Wealth Manager and client agree on a next-meeting date, extract it.

IMPORTANT GUIDELINES:
- Actually read and analyze the transcript content thoroughly
- Extract REAL action points mentioned in the conversation
- For invoices: extract service descriptions and amounts
- For the follow-up meeting: if a next-visit date was agreed OR the client says when they want to meet again, extract it. ALWAYS return follow_up_date as an ISO calendar date (YYYY-MM-DD). If both an explicit calendar date (e.g. "the 23rd of July") AND a relative phrase ("in two weeks") appear, PREFER THE EXPLICIT CALENDAR DATE. If only a relative phrase is given ("in two weeks", "next Tuesday"), resolve it against today's local date below. Extract follow_up_time as HH:MM (24h) if a time is stated; otherwise omit.
- Only include a document type if it was CLEARLY discussed in the session
- Dates should be in YYYY-MM-DD format when possible
- Today is ${localDow ? localDow + ", " : ""}${today}${clientTimezone ? ` (${clientTimezone})` : ""}. Resolve "today", "tomorrow", weekday names (e.g. "until Monday"), and partial dates like "3 July" against this local calendar date. NEVER shift the user's spoken date by a day to convert to UTC.
- Weekday names refer to the NEXT occurrence of that weekday on or after today.

Respond using the provided tool/function schema.`,
          },
          {
            role: "user",
            content: `Please analyze this session content thoroughly and provide a detailed summary with specific action points, and detect any follow-up actions discussed:\n\n${content}`,
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
                  follow_up_appointment: {
                    type: "object",
                    description: "Follow-up appointment details if a next visit was agreed. Null/omit if not discussed.",
                    properties: {
                      follow_up_date: { type: "string", description: "ISO calendar date YYYY-MM-DD for the follow-up. Prefer explicit date mentioned in transcript over relative phrases." },
                      follow_up_time: { type: "string", description: "24-hour time HH:MM if a time was stated. Omit otherwise." },
                      notes: { type: "string", description: "Any context: reason for follow-up, patient's stated preference, etc." },
                    },
                    required: ["follow_up_date"],
                  },
                },
                required: ["summary", "action_points"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_session_summary" } },
        stream: true,
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

    // Consume the SSE stream so bytes keep flowing (avoids the 150s idle timeout
    // on long generations) and rebuild the non-streaming response shape.
    let argsBuffer = "";
    let contentBuffer = "";
    {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta;
            const tc = delta?.tool_calls?.[0];
            if (tc?.function?.arguments) argsBuffer += tc.function.arguments;
            if (typeof delta?.content === "string") contentBuffer += delta.content;
          } catch { /* ignore partial/keep-alive lines */ }
        }
      }
    }
    const data = {
      choices: [{
        message: {
          content: contentBuffer || null,
          tool_calls: argsBuffer ? [{ function: { arguments: argsBuffer } }] : undefined,
        },
      }],
    } as any;
    console.log("AI response received");

    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      // Sanitize follow-up date: must be ISO YYYY-MM-DD and >= today
      if (result?.follow_up_appointment) {
        const fu = result.follow_up_appointment;
        const iso = typeof fu.follow_up_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fu.follow_up_date) ? fu.follow_up_date : null;
        if (!iso || iso < today) {
          console.warn("Dropping invalid/past follow_up_date:", fu.follow_up_date);
          delete result.follow_up_appointment;
        }
      }
      console.log("Summary generated:", result.summary?.substring(0, 100) + "...");
      console.log("Action points:", result.action_points?.length);
      console.log("Invoice detected:", !!result.invoice);
      console.log("Patient tasks detected:", !!result.patient_tasks);
      console.log("Follow-up detected:", !!result.follow_up_appointment, result.follow_up_appointment?.follow_up_date);
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
