/**
 * Ask Holarc — NLP process library and conversation states.
 *
 * The library is defined here, in code, and versioned. Holarc may only run a
 * process that exists in this list; she never invents one.
 */

export const CONVERSATION_STATES = [
  "WELCOME",
  "INTENTION",
  "OUTCOME",
  "WELL_FORMED_OUTCOME",
  "CURRENT_EXPERIENCE",
  "LANGUAGE_EXPLORATION",
  "RESOURCE",
  "PROCESS_SELECTION",
  "FACILITATION",
  "INTEGRATION",
  "FUTURE_PACING",
  "ECOLOGY",
  "SUMMARY",
  "CLOSE",
] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export interface MaeveProcess {
  key: string;
  name: string;
  /** Plain-language description shown to the person via "What are we doing?". */
  plain: string;
  purpose: string;
  entry: string[];
  contraindications: string[];
  requiresConsent: boolean;
  steps: string[];
  prompts: string[];
  exit: string[];
  futurePacing: boolean;
  ecologyCheck: boolean;
  experiential?: boolean;
}

export const PROCESSES: MaeveProcess[] = [
  {
    key: "well_formed_outcome",
    name: "Well-Formed Outcome",
    plain: "We're getting clear on what you want, in your own words.",
    purpose: "Clarify a desired outcome in positive, sensory, self-initiated, ecological terms.",
    entry: ["The person has named something they want to be different."],
    contraindications: ["The person is in acute distress and has not asked to work on an outcome."],
    requiresConsent: false,
    steps: [
      "Positive statement of what is wanted",
      "Sensory evidence",
      "Context and conditions",
      "Within the person's own control",
      "Value / importance",
      "Ecology",
    ],
    prompts: [
      "What would you like instead?",
      "How will you know when you have it?",
      "What will you see, hear or feel that tells you it's happening?",
      "Where, when and with whom do you want this?",
      "What part of this is yours to start and keep going?",
      "What's important to you about having this?",
      "What happens for you, and for the people around you, if this changes?",
    ],
    exit: ["The person can state the outcome in their own words with sensory evidence."],
    futurePacing: true,
    ecologyCheck: true,
  },
  {
    key: "meta_model",
    name: "Meta Model",
    plain: "We're looking closely at the words you're using.",
    purpose: "Recover deletions, distortions and generalisations in the person's own language.",
    entry: ["The person uses an unspecified noun, verb, comparison, universal or modal operator."],
    contraindications: ["Rapport is fragile or the person has asked to slow down."],
    requiresConsent: false,
    steps: ["Notice the pattern", "Ask the recovery question", "Return the person's own words"],
    prompts: [
      "Who or what specifically?",
      "How specifically?",
      "Compared to what?",
      "Always? Has there ever been a time when that wasn't so?",
      "What would happen if you did?",
      "What stops you?",
      "How do you know that?",
    ],
    exit: ["The person has more specific language for their own experience."],
    futurePacing: false,
    ecologyCheck: false,
  },
  {
    key: "milton_model",
    name: "Milton Model",
    plain: "We're using open, spacious language so your own answers can surface.",
    purpose: "Use artfully vague language to allow the person's unconscious processing.",
    entry: ["The person is exploring and over-specific questioning is narrowing them."],
    contraindications: ["The person has asked for clarity or is disoriented."],
    requiresConsent: false,
    steps: ["Pace current experience", "Lead with permissive, open language", "Return to the person"],
    prompts: [
      "And as you notice that, what else becomes available to you?",
      "You might begin to notice something about that, in your own way and in your own time.",
      "What comes to mind when you sit with that for a moment?",
    ],
    exit: ["The person reports something new arising in their own experience."],
    futurePacing: false,
    ecologyCheck: false,
  },
  {
    key: "resource_elicitation",
    name: "Resource Elicitation",
    plain: "We're finding a time you already had what you need.",
    purpose: "Elicit an existing resourceful state from the person's own history.",
    entry: ["The person has named a state they'd like access to."],
    contraindications: ["The person cannot access any positive memory right now."],
    requiresConsent: false,
    steps: ["Identify the resource", "Locate a specific time", "Step into the memory", "Notice the qualities"],
    prompts: [
      "What would you like to have available to you instead?",
      "Can you remember a time when you had that, even a little?",
      "What was happening then? What did you notice?",
      "Where in your body do you notice that?",
    ],
    exit: ["The person reports accessing the state."],
    futurePacing: true,
    ecologyCheck: false,
    experiential: true,
  },
  {
    key: "anchoring",
    name: "Anchoring",
    plain: "We're linking that resourceful state to something you can do for yourself.",
    purpose: "Associate an elicited resource state with a self-chosen cue.",
    entry: ["A resource state has been elicited and is present now."],
    contraindications: ["No resource state accessible", "The person declines"],
    requiresConsent: true,
    steps: ["Confirm the state is present", "Person chooses their own cue", "Set at peak", "Break state", "Test"],
    prompts: [
      "As you notice that state, what would you like to use to bring it back — a word, an image, a touch of your own?",
      "When it's at its fullest, would you like to make that connection now?",
      "Let's set that aside for a moment. What did you have for breakfast?",
      "What happens when you use your cue now?",
    ],
    exit: ["The person reports the cue brings back something of the state."],
    futurePacing: true,
    ecologyCheck: true,
    experiential: true,
  },
  {
    key: "submodalities",
    name: "Submodalities",
    plain: "We're exploring the qualities of how you picture or hear this.",
    purpose: "Explore the structure of the person's internal representation.",
    entry: ["The person describes an internal image, sound or feeling."],
    contraindications: ["The content is traumatic and unsupported"],
    requiresConsent: true,
    steps: ["Elicit the representation", "Explore its qualities", "Person chooses any change", "Check"],
    prompts: [
      "When you think of that, is there a picture, a sound, a feeling?",
      "Is it near or far? Bright or dim? Moving or still?",
      "If you were to change anything about that, what would you change?",
      "What happens as you do that?",
    ],
    exit: ["The person reports a change or chooses to leave it as it is."],
    futurePacing: true,
    ecologyCheck: true,
    experiential: true,
  },
  {
    key: "perceptual_positions",
    name: "Perceptual Positions",
    plain: "We're looking at this from a few different vantage points.",
    purpose: "Explore self, other and observer perspectives.",
    entry: ["The situation involves another person or a relationship."],
    contraindications: ["Abuse or unsafe dynamics where taking the other's position would be harmful."],
    requiresConsent: true,
    steps: ["First position", "Second position", "Third position", "Return to first"],
    prompts: [
      "From where you stand, what do you notice?",
      "If you were to imagine standing where they stand, what might be there?",
      "And as someone watching both of you, from a distance, what do you notice?",
      "Coming back to yourself now — what's different?",
    ],
    exit: ["The person has returned to first position and reports what they noticed."],
    futurePacing: true,
    ecologyCheck: true,
    experiential: true,
  },
  {
    key: "reframing",
    name: "Reframing",
    plain: "We're exploring other ways this could be held — yours, not mine.",
    purpose: "Invite the person to generate alternative meanings or contexts.",
    entry: ["The person holds one fixed meaning about an event."],
    contraindications: ["Grief or loss where reframing would feel dismissive."],
    requiresConsent: false,
    steps: ["Elicit the current meaning", "Invite other possible meanings from the person", "Check fit"],
    prompts: [
      "What does that mean to you?",
      "What else could it mean?",
      "In what context might that be useful?",
      "Which of those, if any, fits for you?",
    ],
    exit: ["The person has generated their own alternative, or chosen to keep the original."],
    futurePacing: false,
    ecologyCheck: true,
  },
  {
    key: "parts_work",
    name: "Parts Work",
    plain: "We're listening to the different pulls inside you.",
    purpose: "Explore conflicting parts and their positive intentions, in the person's own terms.",
    entry: ["The person describes being torn or in two minds."],
    contraindications: ["Dissociation or the person finds parts language distressing."],
    requiresConsent: true,
    steps: [
      "Identify the parts",
      "Ask each for its positive intention",
      "Find shared intention",
      "Invite negotiation",
      "Ecology check",
      "Integration",
    ],
    prompts: [
      "You've described two pulls. How would you name each of them?",
      "What does that part want for you?",
      "And what does that one want for you?",
      "Is there anything they both want?",
      "What would each need in order to be at ease with that?",
      "How does that sit with the whole of you?",
    ],
    exit: ["The person reports a resolution, or chooses to leave it open."],
    futurePacing: true,
    ecologyCheck: true,
    experiential: true,
  },
  {
    key: "future_pacing",
    name: "Future Pacing",
    plain: "We're taking what you found into a future moment.",
    purpose: "Test the change in an imagined future context.",
    entry: ["A process has completed."],
    contraindications: [],
    requiresConsent: false,
    steps: ["Choose a future context", "Step into it", "Notice what happens"],
    prompts: [
      "Imagine a time coming up where this used to show up. What do you notice now?",
      "How is that different from before?",
    ],
    exit: ["The person reports what they notice."],
    futurePacing: false,
    ecologyCheck: false,
    experiential: true,
  },
  {
    key: "ecology_check",
    name: "Ecology Check",
    plain: "We're checking how this sits with the whole of your life.",
    purpose: "Check the wider consequences of a change with the person.",
    entry: ["A change has occurred."],
    contraindications: [],
    requiresConsent: false,
    steps: ["Self", "Others", "Wider system"],
    prompts: [
      "How does that sit with you?",
      "What happens for the people around you if this stays?",
      "Is there anything about this that doesn't fit?",
    ],
    exit: ["The person confirms the fit, or names what doesn't fit."],
    futurePacing: false,
    ecologyCheck: false,
  },
];

export function processByKey(key?: string | null) {
  return PROCESSES.find((p) => p.key === key) ?? null;
}

export function processCatalogueForPrompt(): string {
  return PROCESSES.map(
    (p) =>
      `- ${p.key} (${p.name}): ${p.purpose}\n  Entry: ${p.entry.join("; ") || "n/a"}\n  Contraindications: ${
        p.contraindications.join("; ") || "none"
      }\n  Consent required: ${p.requiresConsent ? "yes" : "no"}\n  Steps: ${p.steps.join(" → ")}\n  Example questions: ${p.prompts
        .map((q) => `"${q}"`)
        .join(" ")}`,
  ).join("\n");
}
