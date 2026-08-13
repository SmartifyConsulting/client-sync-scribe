/**
 * Relationship insight engine — versioned configuration.
 *
 * Two short conversational selections map to one of nine internal patterns.
 * The pattern number is an INTERNAL key only: it must never be rendered in the
 * patient UI, and the clinician sees translated human-readable insights, never
 * a number, label, score or type name.
 *
 * This is a rapport / communication aid. It is not a clinical, psychological or
 * diagnostic instrument and must never influence clinical decision-making.
 *
 * Wording and mapping can be revised by bumping ENGINE_VERSION — no database
 * migration required, because the raw responses are stored separately.
 */

export const ENGINE_VERSION = "v1";

export type Choice = "A" | "B" | "C" | "none";

export type RelationshipStatus =
  | "not_started"
  | "incomplete"
  | "completed"
  | "insufficient_information";

export type Confidence = "Emerging" | "Moderate" | "Strong";

export interface QuestionOption {
  key: Choice;
  title: string;
  body: string;
}

export interface QuestionSet {
  id: "question_set_1" | "question_set_2";
  heading: string;
  subheading: string;
  options: QuestionOption[];
}

export const QUESTION_SETS: QuestionSet[] = [
  {
    id: "question_set_1",
    heading: "Which sounds most like you?",
    subheading:
      "Read the three descriptions and choose the one that feels most familiar. Go with your first instinct.",
    options: [
      {
        key: "A",
        title: "I like things to be done properly.",
        body:
          "If something isn't quite right, I tend to notice it. I care about doing what I believe is right and can sometimes be harder on myself than other people realise.",
      },
      {
        key: "B",
        title: "People matter enormously to me.",
        body:
          "I naturally notice what other people need and often find myself helping, supporting or encouraging them. Feeling useful and appreciated is important to me.",
      },
      {
        key: "C",
        title: "I like to make things happen.",
        body:
          "I enjoy having goals, making progress and feeling that I'm achieving something worthwhile. I tend to adapt to what a situation requires and like to be seen as capable.",
      },
    ],
  },
  {
    id: "question_set_2",
    heading: "And which feels most like you?",
    subheading:
      "One more. Again, don't overthink it — choose the one that feels most familiar.",
    options: [
      {
        key: "A",
        title: "I tend to experience things quite deeply.",
        body:
          "I notice what feels meaningful to me and value being authentic and true to myself. I can be very aware of what makes me different from other people.",
      },
      {
        key: "B",
        title: "I like to understand things before I act.",
        body:
          "I value knowledge, competence and having enough information to feel prepared. I often prefer some space to think things through for myself.",
      },
      {
        key: "C",
        title: "I like to know where I stand.",
        body:
          "I value trust, security and reliability. I tend to think ahead about what might happen and like to feel prepared for whatever comes my way.",
      },
    ],
  },
];

export const NONE_LABEL = "None of these really feels like me";

/** Internal mapping — never surfaced in any UI. */
const PATTERN_MAP: Record<string, number> = {
  AA: 1,
  AB: 5,
  AC: 6,
  BA: 2,
  BB: 4,
  BC: 9,
  CA: 3,
  CB: 7,
  CC: 8,
};

export interface RelationshipInsight {
  motivators: string[];
  communication: string[];
  sensitivities: string[];
  encouragement: string;
  resistance: string[];
  trust: string[];
  conversation: string[];
  explore: string[];
  confidenceGuidance: string;
}

export const INSIGHT_LIBRARY: Record<number, RelationshipInsight> = {
  1: {
    motivators: ["Doing things properly", "Responsibility", "Integrity", "Improvement"],
    communication: [
      "Be clear and organised",
      "Explain the reasoning behind recommendations",
      "Respect their standards and values",
    ],
    sensitivities: [
      "Feeling criticised",
      "Perceived incompetence",
      "Disorder or lack of follow-through",
    ],
    encouragement:
      "Responds well to acknowledgement of effort and care taken, rather than general praise.",
    resistance: ["Vague plans", "Being rushed", "Advice that feels careless or inconsistent"],
    trust: ["Acknowledge effort", "Be precise", "Avoid unnecessary judgement"],
    conversation: [
      "Set out the plan in clear steps",
      "Invite them to point out anything that doesn't sit right",
    ],
    explore: ["Whether they are being harder on themselves than the situation warrants"],
    confidenceGuidance: "Confirm by noticing how much detail they ask for.",
  },
  2: {
    motivators: ["Helping others", "Feeling valued", "Connection", "Being needed"],
    communication: [
      "Warm and relational",
      "Acknowledge their contribution",
      "Give space for their own needs",
    ],
    sensitivities: [
      "Feeling unappreciated",
      "Feeling rejected",
      "Feeling that their efforts do not matter",
    ],
    encouragement:
      "Responds well to genuine, specific appreciation and to being asked how they are doing.",
    resistance: ["Feeling like a burden", "Impersonal or rushed interactions"],
    trust: [
      "Show genuine appreciation",
      "Ask about their needs, not only everyone else's",
    ],
    conversation: [
      "Ask directly what support they need for themselves",
      "Name the care they give others before turning to their own health",
    ],
    explore: ["Whether their own needs are being set aside for those they care for"],
    confidenceGuidance: "Confirm by noticing how often they redirect to other people.",
  },
  3: {
    motivators: ["Achievement", "Progress", "Competence", "Recognition"],
    communication: ["Clear goals", "Practical next steps", "Focus on progress"],
    sensitivities: ["Feeling unsuccessful", "Feeling incompetent", "Excessive criticism"],
    encouragement: "Responds well to visible progress and to being treated as capable.",
    resistance: ["Open-ended plans without milestones", "Anything that feels like failure"],
    trust: [
      "Recognise progress",
      "Keep discussions purposeful",
      "Explore whether outward confidence matches internal experience",
    ],
    conversation: ["Ask what success would look like for them, rather than assuming"],
    explore: ["Whether difficulties are being minimised to preserve a capable image"],
    confidenceGuidance: "Confirm by noticing whether setbacks are quickly reframed.",
  },
  4: {
    motivators: ["Authenticity", "Meaning", "Being understood as an individual"],
    communication: [
      "Personal rather than generic",
      "Take their experience seriously",
      "Avoid sounding routine or dismissive",
    ],
    sensitivities: ["Feeling misunderstood", "Feeling ordinary or overlooked"],
    encouragement:
      "Responds well to being heard first, before options are offered.",
    resistance: ["Standardised advice", "Having feelings smoothed over"],
    trust: ["Listen fully", "Reflect back what they've said in their own words"],
    conversation: ["Ask what this experience means to them, not only what it feels like"],
    explore: ["How much of their experience they usually keep to themselves"],
    confidenceGuidance: "Confirm by noticing how they describe their experience.",
  },
  5: {
    motivators: ["Understanding", "Competence", "Being properly informed"],
    communication: [
      "Give information and evidence",
      "Allow time to consider",
      "Avoid pressure for an immediate answer",
    ],
    sensitivities: ["Feeling intruded upon", "Being asked to decide before they're ready"],
    encouragement:
      "Responds well to clear explanations and to having the reasoning shared.",
    resistance: ["Being told what to do without the why", "Emotionally loaded persuasion"],
    trust: ["Be accurate", "Respect their need for space and preparation time"],
    conversation: ["Offer written detail and follow up at the next contact"],
    explore: ["Whether they have questions they haven't voiced"],
    confidenceGuidance: "Confirm by noticing how much they research on their own.",
  },
  6: {
    motivators: ["Security", "Trust", "Reliability", "Being prepared"],
    communication: [
      "Be consistent and dependable",
      "Say what will happen next and when",
      "Answer 'what if' questions directly",
    ],
    sensitivities: ["Uncertainty", "Mixed messages", "Feeling unsupported"],
    encouragement: "Responds well to reassurance that is concrete rather than general.",
    resistance: ["Changes without explanation", "Being dismissed as worrying too much"],
    trust: ["Do what you said you'd do", "Be transparent about uncertainty"],
    conversation: ["Walk through the plan and the fallback if it doesn't work"],
    explore: ["What specifically they are most concerned might happen"],
    confidenceGuidance: "Confirm by noticing whether they seek confirmation from others.",
  },
  7: {
    motivators: ["Possibility", "Variety", "Optimism", "Freedom"],
    communication: [
      "Keep it engaging and forward-looking",
      "Offer options rather than a single path",
      "Be brief and concrete",
    ],
    sensitivities: ["Feeling restricted", "Long, heavy or repetitive discussions"],
    encouragement: "Responds well to plans that stay flexible and feel manageable.",
    resistance: ["Rigid regimes", "Dwelling on the negative"],
    trust: ["Stay positive while being honest", "Agree small, doable commitments"],
    conversation: ["Check in on the harder parts they may have skimmed over"],
    explore: ["Whether difficulties are being brushed past lightly"],
    confidenceGuidance: "Confirm by noticing how quickly the topic moves on.",
  },
  8: {
    motivators: ["Autonomy", "Directness", "Being in control of their own decisions"],
    communication: [
      "Be straightforward",
      "Give the bottom line first",
      "Present choices, not instructions",
    ],
    sensitivities: ["Feeling controlled", "Being patronised", "Perceived evasiveness"],
    encouragement: "Responds well to being treated as the decision-maker.",
    resistance: ["Hedging", "Withheld information", "Anything that feels imposed"],
    trust: ["Be direct and honest", "Follow through visibly"],
    conversation: ["Ask which parts of the plan they want to lead on"],
    explore: ["Whether vulnerability is being kept out of the conversation"],
    confidenceGuidance: "Confirm by noticing how they respond to being advised.",
  },
  9: {
    motivators: ["Harmony", "Steadiness", "Ease in relationships"],
    communication: [
      "Unhurried and calm",
      "Invite their view explicitly",
      "Check agreement rather than assuming it",
    ],
    sensitivities: ["Conflict", "Feeling pressured", "Feeling overlooked"],
    encouragement: "Responds well to gentle, consistent encouragement over time.",
    resistance: ["Being pushed to decide quickly", "Too many demands at once"],
    trust: ["Give them time", "Make it safe to disagree"],
    conversation: ["Ask what they would prefer, and wait for the answer"],
    explore: ["Whether agreement in the room reflects genuine agreement"],
    confidenceGuidance: "Confirm by noticing whether concerns surface later rather than in session.",
  },
};

/** Compact clinician-facing summary lines shown in Overview. */
export interface OverviewInsight {
  motivates: string;
  communication: string;
  trust: string;
  mindful: string;
  approach: string;
}

export function toOverviewInsight(pattern: number): OverviewInsight | null {
  const i = INSIGHT_LIBRARY[pattern];
  if (!i) return null;
  const join = (arr: string[]) => {
    const list = arr.map((s) => s.toLowerCase());
    if (list.length <= 1) return list.join("");
    return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  };
  const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1) + ".";
  return {
    motivates: sentence(join(i.motivators)),
    communication: sentence(join(i.communication)),
    trust: sentence(join(i.trust)),
    mindful: sentence(join(i.sensitivities)),
    approach: i.conversation[0].replace(/\.$/, "") + ".",
  };
}

export interface DerivedProfile {
  status: RelationshipStatus;
  pattern: number | null;
  confidence: Confidence | null;
}

export function derive(responses: Partial<Record<string, Choice>>): DerivedProfile {
  const a = responses.question_set_1;
  const b = responses.question_set_2;
  if (!a && !b) return { status: "not_started", pattern: null, confidence: null };
  if (!a || !b) return { status: "incomplete", pattern: null, confidence: null };
  if (a === "none" || b === "none") {
    return { status: "insufficient_information", pattern: null, confidence: null };
  }
  const pattern = PATTERN_MAP[`${a}${b}`] ?? null;
  if (!pattern) return { status: "insufficient_information", pattern: null, confidence: null };
  return { status: "completed", pattern, confidence: "Moderate" };
}

export const LOW_CONFIDENCE_NOTE =
  "Early insight — consider exploring communication preferences directly.";

export const ETHICAL_TOOLTIP =
  "Relationship insight — this information is intended to support rapport and communication. It is not a medical, psychological or diagnostic assessment and should not be used to make clinical decisions.";

/** Close neighbouring patterns for each primary — internal, testing-facing only. */
const SECONDARY_MAP: Record<number, number[]> = {
  1: [3, 6],
  2: [9, 4],
  3: [1, 7],
  4: [2, 5],
  5: [4, 6],
  6: [1, 9],
  7: [3, 9],
  8: [3, 6],
  9: [2, 6],
};

export interface StructuredAssessment {
  pattern: number;
  secondary: number[];
  confidence: Confidence;
  evidence1: string | null;
  evidence2: string | null;
  confirm: string[];
  insight: OverviewInsight | null;
}

const evidenceTitle = (setIdx: number, key?: Choice | null) => {
  if (!key || key === "none") return null;
  return QUESTION_SETS[setIdx].options.find((o) => o.key === key)?.title ?? null;
};

/**
 * Full clinician-facing result for a completed profile: primary pattern,
 * secondary candidates, confidence, the evidence behind each selection and the
 * areas worth confirming in conversation.
 */
export function buildAssessment(
  pattern: number | null,
  confidence: Confidence | null,
  responses?: Partial<Record<string, Choice>> | null,
): StructuredAssessment | null {
  if (!pattern) return null;
  const lib = INSIGHT_LIBRARY[pattern];
  return {
    pattern,
    secondary: SECONDARY_MAP[pattern] ?? [],
    confidence: confidence ?? "Moderate",
    evidence1: evidenceTitle(0, responses?.question_set_1),
    evidence2: evidenceTitle(1, responses?.question_set_2),
    confirm: lib ? [...lib.explore, lib.confidenceGuidance] : [],
    insight: toOverviewInsight(pattern),
  };
}

