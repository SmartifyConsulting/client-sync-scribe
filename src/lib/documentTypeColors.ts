/**
 * Colour mapping for document / template type badges.
 * Uses existing semantic tokens only — no new palette values.
 */
export function documentTypeBadgeClass(name?: string | null): string {
  const n = (name || "").toLowerCase();
  if (n.includes("prescription")) return "bg-primary/15 text-primary";
  if (n.includes("invoice")) return "bg-warning/15 text-warning";
  if (n.includes("certificate")) return "bg-success/15 text-success";
  if (n.includes("referral")) return "bg-terracotta/15 text-terracotta";
  if (n.includes("admission")) return "bg-destructive/15 text-destructive";
  if (n.includes("letter")) return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}
