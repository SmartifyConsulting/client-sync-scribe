import { useTranslation } from "react-i18next";
import {
  Eye,
  MoreVertical,
  Send,
  Edit3,
  Copy,
  Trash2,
  Check,
  RotateCcw,
  Flag,
  Loader2,
  Sparkles,
  User as UserIcon,
  CalendarDays,
  Clock,
  Timer,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getTodoDisplay, type TodoDisplayInput } from "@/lib/todoDisplay";

export interface TodoRowItem extends TodoDisplayInput {
  id: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  is_auto_executed?: boolean;
  document_id?: string | null;
}

interface TodoRowProps {
  todo: TodoRowItem;
  compact?: boolean;
  onToggle: (id: string) => void;
  onStartEdit?: (todo: TodoRowItem) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (todo: TodoRowItem) => void;
  onSend?: (todo: TodoRowItem) => void;
  onPreview?: (todo: TodoRowItem) => void;
  onSetPriority?: (id: string, p: "low" | "medium" | "high") => void;
  isEditing?: boolean;
  editText?: string;
  setEditText?: (v: string) => void;
  saveEdit?: (id: string) => void;
  cancelEdit?: () => void;
  sending?: boolean;
  previewing?: boolean;
}

const PRIORITY_DOT: Record<"low" | "medium" | "high", string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-warning",
  high: "bg-destructive",
};

export function TodoRow({
  todo,
  compact = false,
  onToggle,
  onStartEdit,
  onDelete,
  onDuplicate,
  onSend,
  onPreview,
  onSetPriority,
  isEditing,
  editText,
  setEditText,
  saveEdit,
  cancelEdit,
  sending,
  previewing,
}: TodoRowProps) {
  const { t } = useTranslation();
  const display = getTodoDisplay(todo);
  const Icon = display.icon;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-2 px-2">
        <Checkbox checked={todo.completed} onCheckedChange={() => onToggle(todo.id)} className="h-4 w-4" />
        <Input
          value={editText ?? ""}
          onChange={(e) => setEditText?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit?.(todo.id);
            if (e.key === "Escape") cancelEdit?.();
          }}
          className="h-8 text-sm flex-1"
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit?.(todo.id)}>
          <Check className="h-4 w-4 text-success" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-2 hover:bg-muted/40 group text-sm",
          compact ? "py-1.5" : "py-2",
          todo.completed && "bg-muted/20"
        )}
      >
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          className="h-4 w-4 shrink-0"
        />

        {/* Priority dot */}
        <span
          className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[todo.priority])}
          aria-label={`Priority: ${todo.priority}`}
        />

        {/* Kind icon */}
        <Icon className="h-4 w-4 text-primary shrink-0" />

        {/* Label: patient name (or fallback to type) */}
        <span
          className={cn(
            "flex-1 min-w-0 truncate font-medium",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          {display.patient || display.shortLabel}
        </span>

        {/* Meta: date */}
        {display.date && !compact && (
          <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground shrink-0">
            <CalendarDays className="h-3.5 w-3.5" />
            {display.date}
          </span>
        )}

        {/* Meta: time */}
        {display.time && (
          <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground shrink-0">
            <Clock className="h-3.5 w-3.5" />
            {display.time}
          </span>
        )}

        {/* Meta: duration */}
        {display.duration && !compact && (
          <span className="hidden md:inline-flex items-center gap-1 text-muted-foreground shrink-0">
            <Timer className="h-3.5 w-3.5" />
            {display.duration}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {todo.document_id && onPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={previewing}
                  onClick={() => onPreview(todo)}
                >
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 text-primary" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onStartEdit && (
                <DropdownMenuItem onClick={() => onStartEdit(todo)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  {t("todo.actions.edit")}
                </DropdownMenuItem>
              )}
              {todo.document_id && onSend && (
                <DropdownMenuItem disabled={todo.completed || sending} onClick={() => onSend(todo)}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t("todo.actions.send")}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(todo)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("todo.actions.duplicate")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onToggle(todo.id)}>
                {todo.completed ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("todo.actions.reopen")}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t("todo.actions.markComplete")}
                  </>
                )}
              </DropdownMenuItem>
              {onSetPriority && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Flag className="h-4 w-4 mr-2" />
                    {t("todo.actions.priority")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {(["low", "medium", "high"] as const).map((p) => (
                      <DropdownMenuItem key={p} onClick={() => onSetPriority(todo.id, p)}>
                        <span className={cn("h-2 w-2 rounded-full mr-2", PRIORITY_DOT[p])} />
                        {t(`todo.${p}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(todo.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("todo.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
