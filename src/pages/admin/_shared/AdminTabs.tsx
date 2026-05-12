// Shared underline tab class strings so every admin page renders the same
// flat, professional segmented navigation (no pills, no bright fills).
export const adminTabsListClass =
  "h-auto w-full justify-start rounded-none border-b border-[hsl(var(--admin-border-subtle))] bg-transparent p-0 gap-1";

export const adminTabsTriggerClass =
  "relative h-9 rounded-none border-0 bg-transparent px-3 text-[12.5px] font-medium text-[hsl(var(--admin-text-secondary))] shadow-none " +
  "hover:text-[hsl(var(--admin-text-primary))] " +
  "data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--admin-text-primary))] data-[state=active]:font-semibold data-[state=active]:shadow-none " +
  "data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-[hsl(var(--admin-accent))]";
