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
    const { notes, transcript } = await req.json();
    
    if (!notes && !transcript) {
      return new Response(
        JSON.stringify({ error: "Notes or transcript required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prioritize transcript over notes for better context
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
            content: `You are a professional medical/clinical assistant that creates detailed session summaries. 

Your task is to analyze the session transcript or notes and provide:
1. A comprehensive professional summary (2-4 sentences) that captures the main discussion points, any symptoms/conditions mentioned, treatments discussed, and key decisions made
2. A list of specific, actionable action points/tasks that were mentioned or should be done as a result of this session

IMPORTANT GUIDELINES:
- Actually read and analyze the transcript content thoroughly
- Extract REAL action points mentioned in the conversation (e.g., "patient should take medication X", "schedule follow-up in 2 weeks", "order blood tests")
- If the transcript is a dialogue, pay attention to what was agreed upon
- Include medications discussed, tests ordered, lifestyle recommendations, follow-up appointments
- Make action points specific and actionable (not generic like "follow up")

Respond in JSON format:
{
  "summary": "Detailed professional summary paragraph that reflects the actual conversation content",
  "action_points": ["Specific action 1", "Specific action 2", "Specific action 3"]
}`,
          },
          {
            role: "user",
            content: `Please analyze this session content thoroughly and provide a detailed summary with specific action points:\n\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_session_summary",
              description: "Generate a professional summary and action points from session transcript",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive professional summary of the session (2-4 sentences) based on actual content discussed",
                  },
                  action_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of specific, actionable tasks extracted from the session - things that need to be done",
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
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log("Summary generated:", result.summary?.substring(0, 100) + "...");
      console.log("Action points:", result.action_points?.length);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
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
