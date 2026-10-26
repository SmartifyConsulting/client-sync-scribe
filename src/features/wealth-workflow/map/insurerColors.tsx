/** Brand-inspired colour per insurer (HSL triplets), used for insurer badges and the map legend. */
const INSURERS: { match: RegExp; name: string; hsl: string }[] = [
   { match: /old mutual/i, name: "Old Mutual", hsl: "var(--insurer-old-mutual)" },
  { match: /discovery/i, name: "Discovery", hsl: "var(--insurer-discovery)" },
  { match: /sanlam/i, name: "Sanlam", hsl: "var(--insurer-sanlam)" },
  { match: /liberty/i, name: "Liberty", hsl: "var(--insurer-liberty)" },
  { match: /momentum/i, name: "Momentum", hsl: "var(--insurer-momentum)" },
  { match: /allan gray/i, name: "Allan Gray", hsl: "var(--insurer-allan-gray)" },
  { match: /pps/i, name: "PPS", hsl: "var(--insurer-pps)" },
  { match: /stanlib/i, name: "STANLIB", hsl: "var(--insurer-stanlib)" },
  { match: /hollard/i, name: "Hollard", hsl: "var(--insurer-hollard)" },
  { match: /brightrock/i, name: "BrightRock", hsl: "var(--insurer-brightrock)" },
  { match: /bidvest|fmi/i, name: "Bidvest Life / FMI", hsl: "var(--insurer-bidvest)" },
];
const FALLBACK = "var(--insurer-badge)";

export function insurerColor(provider?: string | null) {
  return INSURERS.find((i) => provider && i.match.test(provider))?.hsl ?? FALLBACK;
}

export function InsurerBadge({ provider, legend = false }: { provider: string; legend?: boolean }) {
  // Badges stay in the single insurer orange; only the Step 4 tabs use per-insurer legend colours.
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold text-[hsl(var(--insurer-foreground))]"
      style={{ background: `hsl(${legend ? insurerColor(provider) : FALLBACK})` }}>{provider}
    </span>
  );
}
