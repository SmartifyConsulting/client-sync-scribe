/**
 * Ask Holarc — response governor.
 *
 * Deterministic detection of advice, suggestion, diagnosis, prediction and
 * interpretation in Holarc's replies. Runs on every reply before it can reach
 * the person. Legitimate process-facilitation language is allowlisted when a
 * process the person consented to is running.
 */

export interface GovernorResult {
  passed: boolean;
  rules: string[];
}

const ADVICE_PATTERNS: [string, RegExp][] = [
  ["advice.should", /\byou (?:should|ought to|need to|must|have to)\b/i],
  ["advice.try", /\b(?:you could try|why don't you|why not try|try to|try doing|give it a try)\b/i],
  ["advice.recommend", /\bi (?:recommend|suggest|advise|would recommend|would suggest|think you)\b/i],
  ["advice.consider", /\b(?:have you considered|you might want to|you may want to|it would help if you|it might help to|the best thing)\b/i],
  ["advice.imperative", /\b(?:make sure you|remember to|be sure to|start by|focus on your)\b/i],
  ["advice.what_you_need", /\bwhat you (?:need|really need) is\b/i],
];

const DIAGNOSIS_PATTERNS: [string, RegExp][] = [
  ["diagnosis.label", /\byou (?:have|are suffering from|are experiencing)\s+(?:anxiety|depression|ptsd|trauma|burnout|adhd|ocd|bipolar|an? (?:disorder|condition|illness))\b/i],
  ["diagnosis.sounds_like", /\b(?:this|that|it) (?:sounds like|seems like|looks like|is likely)\s+(?:anxiety|depression|trauma|burnout|a (?:disorder|condition))\b/i],
  ["diagnosis.clinical", /\b(?:diagnos(?:is|e|ed)|symptom of|clinically|patholog)/i],
];

const INTERPRETATION_PATTERNS: [string, RegExp][] = [
  ["interpretation.what_this_means", /\bwhat (?:this|that) (?:really )?means is\b/i],
  ["interpretation.because", /\b(?:this is|that's) (?:because|due to) (?:your|you)\b/i],
  ["interpretation.you_feel", /\b(?:you're feeling|you are feeling|you feel|you must feel|clearly you)\b/i],
  ["interpretation.the_reason", /\bthe (?:real )?reason (?:you|for this) is\b/i],
];

const PREDICTION_PATTERNS: [string, RegExp][] = [
  ["prediction.will", /\b(?:you'll|you will) (?:feel|be|find|get|notice) (?:better|fine|relief|improvement)\b/i],
  ["prediction.guarantee", /\b(?:this will|that will) (?:work|help|fix|resolve|cure)\b/i],
  ["prediction.outcome", /\b(?:guarantee|definitely will|is going to make you)\b/i],
];

const MEDICAL_PATTERNS: [string, RegExp][] = [
  ["medical.treatment", /\b(?:medication|dosage|prescri\w+|treatment plan|therapy is|see a (?:doctor|specialist) about your)\b/i],
];

/** Phrases that are legitimate when running a consented experiential process. */
const PROCESS_ALLOWLIST: RegExp[] = [
  /\bwould you like to\b/i,
  /\bif you'?re somewhere safe and comfortable\b/i,
  /\bwhen you'?re ready\b/i,
  /\bin your own time\b/i,
  /\bwhat do you notice\b/i,
  /\bwhat happens (?:as|when) you\b/i,
  /\bimagine a time\b/i,
  /\byou might (?:begin to )?notice\b/i,
];

export function detectViolations(text: string, processRunning: boolean): GovernorResult {
  const rules: string[] = [];
  const groups = [
    ...ADVICE_PATTERNS,
    ...DIAGNOSIS_PATTERNS,
    ...INTERPRETATION_PATTERNS,
    ...PREDICTION_PATTERNS,
    ...MEDICAL_PATTERNS,
  ];

  for (const [rule, pattern] of groups) {
    if (!pattern.test(text)) continue;
    // Allow permissive process language only for soft advice-shaped invitations.
    if (
      processRunning &&
      rule.startsWith("advice") &&
      PROCESS_ALLOWLIST.some((p) => p.test(text)) &&
      !/\byou (?:should|must|need to|have to)\b/i.test(text)
    ) {
      continue;
    }
    rules.push(rule);
  }

  return { passed: rules.length === 0, rules };
}

/** Words signalling immediate risk of harm — routed to the safety protocol. */
const CRISIS_PATTERNS: RegExp[] = [
  /\b(?:kill myself|end my life|take my (?:own )?life|suicid\w*|don'?t want to (?:live|be here)|want to die)\b/i,
  /\b(?:hurt|harm|cut) (?:myself|my self)\b/i,
  /\b(?:hurt|kill) (?:someone|him|her|them|my \w+)\b/i,
  /\b(?:overdose|od'?ing|can'?t keep myself safe|no reason to live)\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export const CRISIS_RESPONSE =
  "I want to pause our exploration here, because what you've just shared matters more than any process.\n\n" +
  "I'm a facilitation tool, and I'm not able to keep you safe. A person can.\n\n" +
  "Please reach out right now to someone who can be with you — your doctor, your local emergency number, or a crisis line in your country. " +
  "If you're in immediate danger, please contact emergency services.\n\n" +
  "If there is someone nearby you trust, would you be willing to tell them how you're feeling right now?";

export const MEDICAL_BOUNDARY_RESPONSE =
  "That's a question for your healthcare professional rather than for me — I'm not able to answer anything clinical, and I won't guess.\n\n" +
  "What I can do is stay with your experience of it. What's it like for you, living with that question?";

export const GOVERNOR_FALLBACK =
  "Let me stay with you rather than get ahead of you.\n\nWhat's most present for you as you say that?";
