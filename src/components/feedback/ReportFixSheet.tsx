import { useState } from "react";
import { Bug, Wrench, Sparkles, Send, Search, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type ReportType = "bug" | "fix" | "nice_to_have";
type ReportStatus = "Logged" | "In Process" | "Review" | "Closed";

const STATUSES: ReportStatus[] = ["Logged", "In Process", "Review", "Closed"];

const STATUS_META: Record<ReportStatus, { className: string }> = {
  "Logged": { className: "bg-muted text-muted-foreground border-border" },
  "In Process": { className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  "Review": { className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  "Closed": { className: "bg-green-500/15 text-green-700 border-green-500/30" },
};

interface ReportFixSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_META: Record<ReportType, { label: string; icon: typeof Bug; border: string; chip: string; fill: string }> = {
  bug: { label: "Bug", icon: Bug, border: "border-l-destructive", chip: "bg-destructive/10 text-destructive", fill: "bg-destructive hover:bg-destructive/90" },
  fix: { label: "Fix", icon: Wrench, border: "border-l-primary", chip: "bg-primary/10 text-primary", fill: "bg-primary hover:bg-primary/90" },
  nice_to_have: { label: "Nice-to-have", icon: Sparkles, border: "border-l-amber-500", chip: "bg-amber-500/10 text-amber-700", fill: "bg-amber-500 hover:bg-amber-600" },
};

export function ReportFixSheet({ open, onOpenChange }: ReportFixSheetProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { hasAdminRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["bug-reports-open", showClosed],
    queryFn: async () => {
      let query = supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
      if (!showClosed) query = query.neq("status", "Closed");
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const submit = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      display_name: profile?.full_name || user.email || "Anonymous",
      type,
      title: title.trim().slice(0, 300),
      created_via: "typed",
      status: "Logged",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    toast({ title: "Submitted", description: `${TYPE_META[type].label} logged. Thank you!` });
    queryClient.invalidateQueries({ queryKey: ["bug-reports-open"] });
  };

  const changeStatus = async (id: string, next: ReportStatus) => {
    const { error } = await supabase.from("bug_reports").update({ status: next }).eq("id", id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["bug-reports-open"] });
  };

  const filtered = reports.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.display_name?.toLowerCase().includes(q)
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" /> Report Fix
            </SheetTitle>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border space-y-3">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_META) as ReportType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2 py-2 rounded-md transition-all text-xs font-semibold text-white",
                    meta.fill,
                    active ? "ring-2 ring-foreground/40 shadow-md" : "opacity-70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Input + send */}
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Describe the ${TYPE_META[type].label.toLowerCase()}...`}
              maxLength={300}
              className="text-sm"
            />
            <Button onClick={submit} disabled={!title.trim() || submitting} size="icon" className="shrink-0">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-right">{title.length}/300</p>
        </div>

        {/* Outstanding list */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search outstanding..."
              className="pl-7 h-8 text-xs"
            />
          </div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="h-3 w-3"
            />
            Show closed
          </label>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 py-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No outstanding items.</p>
            ) : (
              filtered.map((r: any) => {
                const meta = TYPE_META[(r.type as ReportType)] || TYPE_META.bug;
                const Icon = meta.icon;
                const status = (STATUSES.includes(r.status) ? r.status : "Logged") as ReportStatus;
                const statusMeta = STATUS_META[status];
                const changedAt = r.status_changed_at || r.updated_at || r.created_at;
                return (
                  <div
                    key={r.id}
                    className={cn("border border-border rounded-md border-l-4 p-3 bg-card flex items-start gap-2", meta.border)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className={cn("text-xs px-1.5 py-0.5 rounded", meta.chip)}>{meta.label}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground break-words">{r.title}</p>
                      {r.description && <p className="text-sm text-muted-foreground mt-0.5 break-words">{r.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.display_name || "Anonymous"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {hasAdminRole ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "text-xs font-semibold px-2 py-1 rounded border transition-opacity hover:opacity-80",
                                statusMeta.className
                              )}
                            >
                              {status}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[120px]">
                            {STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === status}
                                onClick={() => changeStatus(r.id, s)}
                                className="text-xs"
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded border",
                            statusMeta.className
                          )}
                        >
                          {status}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {formatDistanceToNow(new Date(changedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
