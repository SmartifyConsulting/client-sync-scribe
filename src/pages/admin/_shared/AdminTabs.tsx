// Shared tab class strings so every admin page renders the same top-level
// tab bar as the rest of the app (see .claude/skills/HolarchStyling/SKILL.md).
export const adminTabsListClass =
  "flex w-full flex-nowrap overflow-x-auto bg-primary justify-start";

// Charcoal variant for admin tab bars that have no further nested sub-tab
// tier beneath them (see HolarchStyling skill §3/§4 — green is reserved for
// bars that lead to a genuine further tabs tier).
export const adminTabsListClassNeutral =
  "flex w-full flex-nowrap overflow-x-auto bg-neutral-600 justify-start";

export const adminTabsTriggerClass =
  "data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-base font-semibold px-3 py-1.5";
