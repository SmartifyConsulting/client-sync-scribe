import { cn } from "@/lib/utils";

export type UploadStage = "idle" | "uploading" | "transcribing" | "saving" | "done";

export interface UploadProgressState {
  stage: UploadStage;
  /** 0-100. Ignored for the indeterminate transcribing stage. */
  percent: number;
  /** Name of the file currently being processed. */
  fileName?: string;
  /** 1-based index of the current file when several were dropped. */
  current?: number;
  total?: number;
}

const STAGE_LABEL: Record<UploadStage, string> = {
  idle: "",
  uploading: "Uploading",
  transcribing: "Transcribing with AI",
  saving: "Saving",
  done: "Complete",
};

/**
 * Animated upload/transcription progress bar shared by the documents browser
 * drop-zone and the Add Document dialog. Uses a determinate bar for upload and
 * save, and a shimmering indeterminate bar while the AI transcribes.
 */
export function UploadProgressBar({
  state,
  className,
}: {
  state: UploadProgressState;
  className?: string;
}) {
  if (state.stage === "idle") return null;

  const indeterminate = state.stage === "transcribing";
  const pct = state.stage === "done" ? 100 : Math.max(4, Math.min(100, state.percent));

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-foreground truncate">
          {STAGE_LABEL[state.stage]}
          {state.fileName ? ` — ${state.fileName}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
          {state.total && state.total > 1 ? `File ${state.current} of ${state.total}` : null}
          {!indeterminate && state.stage !== "done" ? ` ${Math.round(pct)}%` : ""}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {indeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-primary animate-[upload-shimmer_1.2s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
