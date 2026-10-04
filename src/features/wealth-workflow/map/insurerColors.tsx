/** Brand-inspired colour per insurer (HSL triplets), used for insurer badges and the map legend. */
const INSURERS: { match: RegExp; name: string; hsl: string }[] = [
  { match: /old mutual/i, name: "Old Mutual", hsl: "150 70% 28%" },
  { match: /discovery/i, name: "Discovery", hsl: "205 90% 35%" },
  { match: /sanlam/i, name: "Sanlam", hsl: "210 75% 30%" },
  { match: /liberty/i, name: "Liberty", hsl: "230 55% 30%" },
  { match: /momentum/i, name: "Momentum", hsl: "330 65% 38%" },
  { match: /allan gray/i, name: "Allan Gray", hsl: "0 0% 25%" },
  { match: /pps/i, name: "PPS", hsl: "200 60% 40%" },
  { match: /stanlib/i, name: "STANLIB", hsl: "215 70% 40%" },
  { match: /hollard/i, name: "Hollard", hsl: "280 45% 40%" },
  { match: /brightrock/i, name: "BrightRock", hsl: "20 80% 45%" },
];
const FALLBACK = "35 85% 38%";

export function insurerColor(provider?: string | null) {
  return INSURERS.find((i) => provider && i.match.test(provider))?.hsl ?? FALLBACK;
}

export function InsurerBadge({ provider }: { provider: string }) {
  const c = insurerColor(provider);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold text-white"
      style={{ background: `hsl(${c})` }}>{provider}
    </span>
  );
}
