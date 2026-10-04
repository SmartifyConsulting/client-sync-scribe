import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowGroupCard } from "./WorkflowGroupCard";
import type { GroupView } from "./useWorkflowMap";
import type { MapAvatars } from "./StepAvatar";

/** Fine 1px grey connector with a small solid arrowhead. */
function Arrow({ dir }: { dir: "right" | "down" | "up" | "left" }) {
  const vertical = dir === "down" || dir === "up";
  return (
    <div className={cn("flex items-center justify-center text-muted-foreground", vertical ? "h-7 flex-col" : "h-full w-full")} aria-hidden>
      {vertical ? (
        <svg width="10" height="28" viewBox="0 0 10 28" className={dir === "up" ? "rotate-180" : ""}>
          <line x1="5" y1="0" x2="5" y2="22" stroke="currentColor" strokeWidth="1" />
          <path d="M1 21 L5 28 L9 21 Z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="28" height="10" viewBox="0 0 28 10" className={dir === "left" ? "rotate-180" : ""}>
          <line x1="0" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1" />
          <path d="M21 1 L28 5 L21 9 Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

function DocumentsTile({ count, onOpen }: { count: number; onOpen?: () => void }) {
  return (
    <button type="button" onClick={onOpen} id="wealth-docs-tile"
      className="flex w-full flex-col items-center justify-center gap-3 rounded-xl bg-muted/50 p-5 transition-colors hover:bg-muted">
      <span className="relative flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
        <span className="absolute -right-2.5 -top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{count}</span>
      </span>
      <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Documents</span>
    </button>
  );
}

interface Props {
  groups: GroupView[];
  blockers: string[];
  viewer: "manager" | "client";
  clientFirst: string;
  docCount: number;
  onOpenDocuments?: () => void;
  onSelectStep: (group: string, step: string) => void;
  avatars?: MapAvatars;
}

/** Workflow map: six step frames linked by fine arrows, plus the Documents tile. */
export function WorkflowCanvas({ groups, blockers, viewer, clientFirst, docCount, onOpenDocuments, onSelectStep, avatars }: Props) {
  const by = (k: string) => groups.find((g) => g.group.key === k);
  const card = (k: string) => {
    const v = by(k);
    if (!v) return <div />;
    return (
      <WorkflowGroupCard key={`${k}-${v.state}`} view={v} blockers={blockers} onOpen={() => {}} viewer={viewer} clientFirst={clientFirst}
        avatars={avatars} onSelectStep={(label) => onSelectStep(k, label)} />
    );
  };

  return (
    <>
      {/* Phone: one column, top to bottom */}
      <div className="space-y-0 md:hidden">
        {["gateway", "needs", "portfolio", "quotes", "presentation", "issuance"].map((k, i) => (
          <div key={k}>{i > 0 && <Arrow dir="down" />}{card(k)}</div>
        ))}
        <div className="pt-4"><DocumentsTile count={docCount} onOpen={onOpenDocuments} /></div>
      </div>

      {/* Larger screens: perimeter loop */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] md:items-start">
        {card("gateway")}
        <div className="flex h-12 items-center"><Arrow dir="right" /></div>
        {card("needs")}

        <div className="row-span-3 pt-7 pr-8"><DocumentsTile count={docCount} onOpen={onOpenDocuments} /></div>
        <div />
        <Arrow dir="down" />
        <div />
        {card("portfolio")}
        <div />
        <Arrow dir="down" />

        <div className="pt-6">{card("issuance")}</div>
        <div />
        {card("quotes")}

        <Arrow dir="up" />
        <div />
        <Arrow dir="down" />

        {card("presentation")}
        <div className="flex h-12 items-center"><Arrow dir="left" /></div>
        <div className="mt-6 h-px w-1/2 bg-muted-foreground" aria-hidden />
      </div>
    </>
  );
}

export default WorkflowCanvas;
