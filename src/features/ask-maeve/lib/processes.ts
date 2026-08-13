/** Plain-language labels for the NLP processes and conversation states. */

export const PROCESS_LABELS: Record<string, { name: string; plain: string }> = {
  well_formed_outcome: { name: "Clarifying", plain: "We're getting clear on what you want, in your own words." },
  meta_model: { name: "Exploring words", plain: "We're looking closely at the words you're using." },
  milton_model: { name: "Open exploring", plain: "We're using open language so your own answers can surface." },
  resource_elicitation: { name: "Resource", plain: "We're finding a time you already had what you need." },
  anchoring: { name: "Anchoring", plain: "We're linking that state to something you can do for yourself." },
  submodalities: { name: "Qualities", plain: "We're exploring the qualities of how you picture or hear this." },
  perceptual_positions: { name: "Perspectives", plain: "We're looking at this from a few different vantage points." },
  reframing: { name: "Other framings", plain: "We're exploring other ways this could be held — yours, not mine." },
  parts_work: { name: "Parts", plain: "We're listening to the different pulls inside you." },
  future_pacing: { name: "Future pace", plain: "We're taking what you found into a future moment." },
  ecology_check: { name: "Ecology", plain: "We're checking how this sits with the whole of your life." },
};

export const STATE_LABELS: Record<string, { name: string; plain: string }> = {
  WELCOME: { name: "Starting", plain: "We're just beginning. There's nothing you need to prepare." },
  INTENTION: { name: "Intention", plain: "We're finding out what you'd like from this conversation." },
  OUTCOME: { name: "Outcome", plain: "We're naming what you'd like instead." },
  WELL_FORMED_OUTCOME: { name: "Clarifying", plain: "We're making what you want clearer and more concrete." },
  CURRENT_EXPERIENCE: { name: "Exploring", plain: "We're staying with what it's like for you now." },
  LANGUAGE_EXPLORATION: { name: "Exploring words", plain: "We're looking closely at the words you're using." },
  RESOURCE: { name: "Resource", plain: "We're finding something you already have." },
  PROCESS_SELECTION: { name: "Choosing", plain: "You're choosing whether to try something, or not." },
  FACILITATION: { name: "Working", plain: "We're going through the steps you agreed to." },
  INTEGRATION: { name: "Integrating", plain: "We're noticing what's different for you." },
  FUTURE_PACING: { name: "Future pace", plain: "We're taking this into a moment that's coming up." },
  ECOLOGY: { name: "Ecology", plain: "We're checking how this sits with the rest of your life." },
  SUMMARY: { name: "Summing up", plain: "We're gathering what you explored, in your words." },
  CLOSE: { name: "Closing", plain: "We're closing this exploration." },
};

export function stateLabel(state?: string | null) {
  return (state && STATE_LABELS[state]) || STATE_LABELS.WELCOME;
}

export function processLabel(key?: string | null) {
  return key ? PROCESS_LABELS[key] ?? null : null;
}
