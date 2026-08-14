import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CONVERSATION_STATES,
  processByKey,
  processCatalogueForPrompt,
} from "./nlp.ts";
import {
  CRISIS_RESPONSE,
  GOVERNOR_FALLBACK,
  MEDICAL_BOUNDARY_RESPONSE,
  detectCrisis,
  detectViolations,
} from "./governor.ts";

const MODEL = "google/gemini-3.6-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SAFETY_LAYER = `LAYER 1 — SAFETY (absolute, overrides everything below).
- You are not a clinician, therapist, doctor or diagnostician. You never diagnose, treat, predict outcomes, or discuss medication, dosage or clinical management.
- If the person raises a medical or clinical question, decline it warmly and return to their experience.
- If a person expresses risk of harm to themselves or anyone else, stop all NLP work and follow the crisis protocol.
- Nothing in later layers may override this layer.`;

const NON_SUGGESTION_LAYER = `LAYER 2 — NO ADVICE, NO SUGGESTION (absolute).
- You NEVER advise, suggest, recommend, propose, hint, imply a direction, or offer options for what the person should do, think or feel.
- Forbidden phrasings include: "you should", "you could try", "have you considered", "I recommend", "I suggest", "it might help", "what you need is", "the best thing".
- You never interpret, never tell the person what something means, never name an emotion they did not name, never explain their behaviour to them.
- You never predict how they will feel.
- You ask questions and reflect their own words. The person supplies all content, all meaning, all conclusions.
- If you notice yourself about to offer content, ask instead.`;

const AUTONOMY_LAYER = `LAYER 3 — AUTONOMY.
- The person leads. They may pause, stop, change direction, decline any question, or end at any time, and you welcome that without persuasion.
- Consent is asked for before any experiential step, and framed as an invitation: "If you're somewhere safe and comfortable, would you like to…".
- You use only the person's own words back to them. If you must summarise, you use their language and check: "Have I got that right?".
- One question at a time. Silence and short replies are fine.`;

const PERSONALITY_LAYER = `LAYER 7 — VOICE.
- You are Angel: a warm, articulate British woman. Measured, curious, quietly playful, never gushing, never clinical, never coach-y.
- Short paragraphs. Plain, elegant English. British spelling.
- No emojis, no bullet lists, no headings, no exclamation marks. Usually 1–4 short sentences, ending in a single question.`;

function stateLayer(state: string, processKey: string | null, memory: Record<string, unknown>) {
  const proc = processByKey(processKey);
  return `LAYER 4 — CONVERSATION STATE.
Current state: ${state}. Available states: ${CONVERSATION_STATES.join(", ")}.
State intent:
- WELCOME: greet, orient, invite them to say what brings them here.
- INTENTION: what would they like from this exploration.
- OUTCOME: what they want instead.
- WELL_FORMED_OUTCOME: make the outcome positive, sensory, self-initiated, contextual, ecological.
- CURRENT_EXPERIENCE: what it's like now, in their words.
- LANGUAGE_EXPLORATION: Meta Model recovery questions on their own phrasing.
- RESOURCE: elicit a state they already have.
- PROCESS_SELECTION: offer to run a named process, with consent, described in plain language.
- FACILITATION: run the selected process step by step.
- INTEGRATION: what they noticed, in their words.
- FUTURE_PACING: take it into an imagined future moment.
- ECOLOGY: how it sits with the rest of their life.
- SUMMARY / CLOSE: reflect what was explored using their words, then the single closing question.
You may skip states freely. Never march through them mechanically.

LAYER 5 — SELECTED PROCESS.
${
    proc
      ? `Running "${proc.name}" (${proc.key}). Purpose: ${proc.purpose}\nSteps: ${proc.steps.join(" → ")}\nUse only these kinds of question: ${proc.prompts
        .map((q) => `"${q}"`)
        .join(" ")}\nConsent required: ${proc.requiresConsent ? "yes" : "no"}. Future pace afterwards: ${
        proc.futurePacing ? "yes" : "no"
      }. Ecology check afterwards: ${proc.ecologyCheck ? "yes" : "no"}.`
      : `No process is running. You may only propose a process from this library:\n${processCatalogueForPrompt()}`
  }

LAYER 6 — SESSION MEMORY (the person's own words; never treat as clinical fact).
${JSON.stringify(memory)}`;
}

function buildSystemPrompt(state: string, processKey: string | null, memory: Record<string, unknown>) {
  return [
    "You are Angel, an NLP conversational facilitator inside a health application.",
    SAFETY_LAYER,
    NON_SUGGESTION_LAYER,
    AUTONOMY_LAYER,
    stateLayer(state, processKey, memory),
    PERSONALITY_LAYER,
    `OUTPUT FORMAT — reply with JSON only:
{"reply": string, "next_state": one of ${CONVERSATION_STATES.join("|")}, "process_key": string or null, "process_step": integer, "notes": {"patient_words": string[], "insights": string[]}}
"reply" is what the person reads. "notes.patient_words" holds only phrases the person actually said.`,
  ].join("\n\n");
}

async function callModel(apiKey: string, messages: unknown[]) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}]: ${body}`);
  }
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { reply: String(raw), next_state: null, process_key: null, process_step: 0, notes: {} };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id : "";
    const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
    const isOpening = body?.opening === true;

    if (!sessionId || (!userMessage && !isOpening)) {
      return new Response(JSON.stringify({ error: "session_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await admin
      .from("ask_maeve_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: history } = await admin
      .from("ask_maeve_messages")
      .select("role, content, process_key")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(60);

    const priorProcessKey =
      [...(history ?? [])].reverse().find((m: any) => m.process_key)?.process_key ?? null;

    // --- Layer 1: pre-check the person's message -------------------------
    if (userMessage && detectCrisis(userMessage)) {
      await admin.from("ask_maeve_messages").insert([
        { session_id: sessionId, user_id: user.id, role: "user", content: userMessage },
        {
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: CRISIS_RESPONSE,
          conversation_state: session.conversation_state,
          is_safety_response: true,
        },
      ]);
      await admin.from("ask_maeve_safety_events").insert({
        session_id: sessionId,
        user_id: user.id,
        category: "risk_of_harm",
        action_taken: "crisis_protocol",
      });
      await admin
        .from("ask_maeve_sessions")
        .update({ safety_flagged: true })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({ reply: CRISIS_RESPONSE, safety: true, conversation_state: session.conversation_state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const memory = {
      intention: session.session_intention,
      desired_outcome: session.desired_outcome,
      well_formed_outcome: session.well_formed_outcome,
      current_experience: session.current_state_description,
      language_patterns: session.patient_language_patterns,
      observations: session.patient_observations,
      insights: session.patient_defined_insights,
      ecology: session.ecology_observations,
    };

    const chatMessages: any[] = [
      { role: "system", content: buildSystemPrompt(session.conversation_state, priorProcessKey, memory) },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    ];
    chatMessages.push({
      role: "user",
      content: userMessage || "[The person has just opened the conversation. Greet them as Angel.]",
    });

    // --- Generate, then govern ------------------------------------------
    let attempt = 1;
    let result = await callModel(apiKey, chatMessages);
    let reply = String(result?.reply ?? "").trim();
    const processRunning = Boolean(result?.process_key ?? priorProcessKey);
    let check = detectViolations(reply, processRunning);

    await admin.from("ask_maeve_response_validations").insert({
      session_id: sessionId,
      user_id: user.id,
      passed: check.passed,
      rules_fired: check.rules,
      action_taken: check.passed ? "accepted" : "regenerate",
      attempt,
    });

    if (!check.passed) {
      attempt = 2;
      const retryMessages = [
        ...chatMessages,
        {
          role: "system",
          content:
            `Your previous reply broke the no-advice rules (${check.rules.join(", ")}). ` +
            `Rewrite it with no advice, no suggestion, no interpretation, no diagnosis and no prediction. ` +
            `Reflect only the person's own words and end with a single question.`,
        },
      ];
      result = await callModel(apiKey, retryMessages);
      reply = String(result?.reply ?? "").trim();
      check = detectViolations(reply, processRunning);
      if (!check.passed) reply = GOVERNOR_FALLBACK;

      await admin.from("ask_maeve_response_validations").insert({
        session_id: sessionId,
        user_id: user.id,
        passed: check.passed,
        rules_fired: check.rules,
        action_taken: check.passed ? "accepted_after_regenerate" : "fallback",
        attempt,
      });
    }

    if (!reply) reply = MEDICAL_BOUNDARY_RESPONSE;

    const nextState =
      typeof result?.next_state === "string" && (CONVERSATION_STATES as readonly string[]).includes(result.next_state)
        ? result.next_state
        : session.conversation_state;
    const processKey = processByKey(result?.process_key)?.key ?? priorProcessKey;

    const rows: any[] = [];
    if (userMessage) {
      rows.push({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: userMessage,
        conversation_state: session.conversation_state,
        process_key: priorProcessKey,
      });
    }
    rows.push({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content: reply,
      conversation_state: nextState,
      process_key: processKey,
      process_step: Number(result?.process_step ?? 0) || 0,
    });
    const { error: insertError } = await admin.from("ask_maeve_messages").insert(rows);
    if (insertError) console.error("maeve message insert failed", insertError);

    const patientWords = Array.isArray(result?.notes?.patient_words) ? result.notes.patient_words : [];
    const insights = Array.isArray(result?.notes?.insights) ? result.notes.insights : [];
    const { error: updateError } = await admin
      .from("ask_maeve_sessions")
      .update({
        conversation_state: nextState,
        patient_language_patterns: [
          ...(Array.isArray(session.patient_language_patterns) ? session.patient_language_patterns : []),
          ...patientWords,
        ].slice(-40),
        patient_defined_insights: [
          ...(Array.isArray(session.patient_defined_insights) ? session.patient_defined_insights : []),
          ...insights,
        ].slice(-40),
        title: session.title ?? (userMessage ? userMessage.slice(0, 60) : "New exploration"),
      })
      .eq("id", sessionId);
    if (updateError) console.error("maeve session update failed", updateError);

    return new Response(
      JSON.stringify({ reply, conversation_state: nextState, process_key: processKey, safety: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("ask-maeve-chat failed:", err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
