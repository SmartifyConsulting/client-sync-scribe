import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Square,
  User,
  Clock,
  Loader2,
  CheckCircle,
  X,
  Volume2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AudioWaveform } from "@/components/sessions/AudioWaveform";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RecordingBarProps {
  patientName?: string;
  sessionDuration: number;
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  audioUrl: string | null;
  onToggleRecording: () => void;
  onCompleteSession: () => void;
  onCancelSession: () => void;
}

export function RecordingBar({
  patientName,
  sessionDuration,
  isRecording,
  isTranscribing,
  transcript,
  audioUrl,
  onToggleRecording,
  onCompleteSession,
  onCancelSession,
}: RecordingBarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-b border-border bg-background shadow-sm">
      {/* Main Recording Bar */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Patient Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {patientName || "Session"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{formatDuration(sessionDuration)}</span>
              {isRecording && (
                <Badge variant="destructive" className="h-4 text-[10px] px-1.5 animate-pulse">
                  REC
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Recording Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleRecording}
            disabled={isTranscribing}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
              isTranscribing && "opacity-50 cursor-not-allowed",
              isRecording
                ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <div className="text-xs text-muted-foreground w-24">
            {isTranscribing
              ? "Transcribing..."
              : isRecording
                ? "Recording..."
                : "Tap to record"}
          </div>
        </div>

        {/* Compact Waveform */}
        {(isRecording || isTranscribing) && (
          <div className="w-32 hidden sm:block">
            <AudioWaveform isRecording={isRecording} />
          </div>
        )}

        {/* Transcript Preview */}
        {transcript && (
          <div className="flex-1 min-w-0 hidden md:block">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                {transcript.slice(0, 100)}
                {transcript.length > 100 && "..."}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onCancelSession}
            disabled={isTranscribing}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Cancel</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={onCompleteSession}
            disabled={isTranscribing}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Complete</span>
          </Button>

          {/* Expand/Collapse Button */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Expandable Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Transcript */}
            {transcript && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Full Transcript</span>
                  {!isTranscribing && (
                    <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded">
                      ✓ Complete
                    </span>
                  )}
                </div>
                <div className="bg-background rounded-lg border border-border p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {transcript}
                  </p>
                </div>
              </div>
            )}

            {/* Audio Playback */}
            {audioUrl && !isRecording && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Recording Playback</span>
                </div>
                <audio controls className="w-full h-10" src={audioUrl}>
                  Your browser does not support audio.
                </audio>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
