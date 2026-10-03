import { cn } from "@/lib/utils";

export type UploadStage =
  | "idle"
  | "uploading"
  | "transcribing"
  | "analysing"
  | "extracting"
  | "saving"
  | "done"
  | "error";

export interface UploadProgressState {
  stage: UploadStage;
  /** 0-100. Ignored for the indeterminate AI stages. */
  percent: number;
  /** Name of the file currently being processed. */
  fileName?: string;
  /** 1-based index of the current file when several were dropped. */
  current?: number;
  total?: number;
  /** Plain-English reason shown when the stage is "error". */
  message?: string;
}

const STAGE_LABEL: Record<UploadStage, string> = {
  idle: "",
  uploading: "Uploading document…",
  transcribing: "Transcribing handwritten notes…",
  analysing: "Describing the image with AI…",
  extracting: "Extracting medical history…",
  saving: "Recording data in the app…",
  done: "Done",
  error: "Upload stopped",
};

/**
 * Animated upload/transcription progress bar shared by the documents browser
 * drop-zone and the Add Document dialog. Narrates every stage of the pipeline
 * so a long AI transcription never looks like a stall.
 */
export function UploadProgressBar({
  state,
  className,
}: {
  state: UploadProgressState;
  className?: string;
}) {
  if (state.stage === "idle") return null;

  const indeterminate =
    state.stage === "transcribing" ||
    state.stage === "analysing" ||
    state.stage === "extracting";
  const isError = state.stage === "error";
  const pct = state.stage === "done" ? 100 : Math.max(4, Math.min(100, state.percent));

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs font-medium truncate",
            isError ? "text-destructive" : "text-foreground",
          )}
        >
          {STAGE_LABEL[state.stage]}
          {state.fileName ? ` — ${state.fileName}` : ""}
        </p>
        <p className="text-2xs text-muted-foreground whitespace-nowrap">
          {state.total && state.total > 1 ? `File ${state.current} of ${state.total}` : null}
          {!indeterminate && !isError && state.stage !== "done" ? ` ${Math.round(pct)}%` : ""}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {indeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-primary animate-[upload-shimmer_1.2s_ease-in-out_infinite]" />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              isError ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {isError && state.message ? (
        <p className="text-2xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}
