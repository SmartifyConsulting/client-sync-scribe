# Ask Maeve — NLP Conversational Facilitator

A new module where a person explores their own experience through structured NLP processes. Maeve asks; she never advises, diagnoses, suggests or interprets.

## Navigation

- New nav item **Ask Maeve** placed directly above **SOS** in the sidebar (patient menu, doctor "My Holarchy" group, nurse menu) and in the mobile bottom nav.
- Styling: yellow-orange pill/button with white text and a sparkle-style icon, visually distinct from the red SOS control. Colour added as a semantic token in the design system (no hard-coded hex in components).
- Route: `/ask-maeve` (session list + new session) and `/ask-maeve/:sessionId` (conversation page). The session ID always lives in the URL so reloading restores that exact conversation.

## Conversation experience

- Calm, generously spaced chat. Maeve's messages visually distinct from the person's. Large readable typography, existing app fonts.
- Header: "Ask Maeve" with a quiet status line ("Exploration in progress").
- Persistent disclaimer strip: Maeve is a facilitation tool, not a clinician, and gives no advice or diagnosis.
- Process indicator chips (Exploring → Resource → Anchoring → Future Pace) shown only when a process is running, using plain language.
- **What are we doing?** button explaining the current step in everyday words.
- Always-visible controls: Pause, Stop, Change direction, Start again, "I'd rather not answer that". Change direction makes Maeve ask "Where would you like to go instead?".
- Streaming replies with a typing indicator; the composer stays focused between turns.
- Session summary on close: what was explored, the person's own words, and the single closing question "What, if anything, would you like to explore from here?" — never next steps.

## Safety and non-suggestion enforcement

Two independent layers, both server-side:

1. **Pre-check on the person's message** — a safety classifier. Any expression of immediate risk of harm halts NLP processing and returns a calm, protocol-compliant response encouraging immediate human/professional help; the event is logged.
2. **Response governor on every Maeve reply, before it reaches the screen** — a deterministic suggestion/advice detector (phrase and pattern matching for "you should", "try", "I recommend", "have you considered", diagnosis and prediction language, plus introduction of emotions/diagnoses the person never used) combined with an AI validator pass. Anything failing is regenerated once with the violation named; a second failure falls back to a safe facilitative question.
3. Process-facilitation language belonging to an explicitly selected process is allowlisted, so legitimate experiential instructions are not blocked.
4. Medical/clinical questions get a boundary response inviting the person to raise it with their healthcare professional; no answer, no diagnosis.

Every validation result (pass/fail, rule fired, action taken) is stored for audit.

## NLP process engine

A versioned process library defined in code (not invented by the model): Well-Formed Outcome, Meta Model, Milton Model, Resource Elicitation, Anchoring, Submodalities, Perceptual Positions, Reframing, Parts Work / six-step, Future Pacing, Ecology Check, and experiential/eyes-closed guidance.

Each process carries: purpose, entry conditions, contraindications, consent requirement, required sequence, optional steps, prompt bank, exit conditions, integration questions, future-pacing and ecology requirements. Experiential steps always offer the invitation form ("If you're somewhere safe and comfortable, would you like to…") and can be declined.

A conversation controller holds the state machine (Welcome → Intention → Outcome → Well-Formed Outcome → Current Experience → Language Exploration → Resource → Process Selection → Facilitation → Integration → Future Pacing → Ecology → Summary → Close) and chooses the next state per turn — conversations skip states freely rather than marching through all of them.

## Voice

Phase 1 ships text. Maeve's replies can optionally be spoken with a warm, articulate British-female text-to-speech voice via a play control on each message (no impersonation of any real person or character). Voice input reuses the app's existing dictation.

## Privacy

Ask Maeve conversations are private to the person. Clinicians do not see transcripts. Longitudinal data (sleep, mood, medication, prior sessions) is only referenced after explicit in-session permission, and never as an interpreted correlation — only as an invitation to explore.

## Technical notes

**Database** (new tables, RLS scoped to the owning user, plus grants):
`ask_maeve_sessions`, `ask_maeve_messages`, `ask_maeve_processes` (library metadata, read-only), `ask_maeve_session_processes`, `ask_maeve_outcomes`, `ask_maeve_resources`, `ask_maeve_anchors`, `ask_maeve_safety_events`, `ask_maeve_response_validations`. Structured session memory (intention, desired outcome, well-formed outcome fields, resources, anchors, observations, ecology notes, patient-defined insights, safety flags) is stored separately from the transcript, and AI-derived process metadata is stored in clearly separate columns from what the person actually said — never as clinical fact.

**Backend**: a streaming edge function (`ask-maeve-chat`) using the app's existing AI infrastructure, with layered system instructions assembled per request in strict priority order — safety → non-suggestion → autonomy → conversation state → selected process → history → personality. Lower layers cannot override higher ones. A second function handles session summarisation; an optional third handles text-to-speech.

**Frontend**: `src/features/ask-maeve/` holding the pages, chat components, process indicator, controls, and a client-side mirror of the suggestion detector for defence in depth. Existing auth, patient identity, section-accordion, button and typography conventions are reused throughout.

## Out of scope for this build

Clinician-facing analytics dashboards over Maeve usage, and automatic cross-module correlation.
