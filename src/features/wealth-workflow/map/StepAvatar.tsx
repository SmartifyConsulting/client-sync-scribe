import { cn } from "@/lib/utils";

export interface MapAvatars {
  client?: { url?: string | null; name: string };
  advisor?: { url?: string | null; name: string };
}

/** Small avatar of whoever acts on a sub-step; ring colour = owner (green client, blue Wealth Manager). */
export function StepAvatar({ owner, avatars, className }: { owner: string; avatars?: MapAvatars; className?: string }) {
  const key = owner === "wealth_manager" ? "advisor" : owner;
  const person = key === "client" ? avatars?.client : key === "advisor" ? avatars?.advisor : undefined;
  const ring = key === "advisor" ? "ring-[hsl(var(--owner-advisor))]" : key === "client" ? "ring-[hsl(var(--owner-client))]" : "ring-muted-foreground";
  const initials = (person?.name ?? (key === "insurer" ? "Insurer" : "System"))
    .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span
      title={person?.name}
      className={cn("flex h-5 w-5 flex-none items-center justify-center overflow-hidden rounded-full bg-card text-[9px] font-semibold text-foreground ring-2", ring, className)}
    >
      {person?.url ? <img src={person.url} alt={person.name} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

/** Animate a small document icon from `from` into the Documents tile on the map. */
export function flyToDocuments(from: HTMLElement | null) {
  const target = document.getElementById("wealth-docs-tile");
  if (!from || !target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.style.cssText = `position:fixed;z-index:9999;left:${a.left + a.width / 2 - 28}px;top:${a.top + a.height / 2 - 36}px;width:56px;height:72px;border-radius:6px;background:hsl(var(--card));border:1px solid hsl(var(--border));box-shadow:0 10px 30px -8px rgba(0,0,0,.35);pointer-events:none;display:flex;flex-direction:column;gap:5px;padding:10px 8px;`;
  for (let i = 0; i < 5; i++) {
    const l = document.createElement("span");
    l.style.cssText = `display:block;height:3px;border-radius:2px;background:hsl(var(--muted-foreground)/.35);width:${i === 4 ? 55 : 100}%`;
    ghost.appendChild(l);
  }
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 80}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) scale(.25) rotate(0deg)`, opacity: 0.2 },
    ],
    { duration: 900, easing: "cubic-bezier(.5,0,.3,1)" },
  );
  anim.onfinish = () => {
    ghost.remove();
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 350 });
  };
}
