import { useState } from "react";
import { Plus, Trash2, Mail, Loader2, UserCog, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePractice } from "@/hooks/usePractice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Practice Management Assistant (PMA) administration.
 *
 * The PMA keeps their own patient profile, but gains access to the practice
 * doctors' patient list, the shared calendar and task assignment.
 */
export function PracticeAssistants() {
  const {
    practice,
    members,
    invitations,
    isOwner,
    inviteMember,
    resendInvitation,
    updateMemberRole,
    removeMember,
    revokeInvitation,
    createPractice,
  } = usePractice();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [practiceName, setPracticeName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; email: string } | null>(null);

  const assistants = members.filter((m) => m.role === "assistant");
  const pending = invitations.filter(
    (i) => i.status === "pending" && (i as any).invited_role === "assistant",
  );

  const emailValid = EMAIL_RE.test(email.trim());
  const alreadyInvited = pending.some(
    (i) => (i.invited_email ?? "").toLowerCase() === email.trim().toLowerCase(),
  );

  const handleInvite = async () => {
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (alreadyInvited) {
      toast.error("That email already has a pending invitation");
      return;
    }
    setBusy(true);
    await inviteMember(clean, "assistant");
    setEmail("");
    setBusy(false);
  };

  if (!practice) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Create a practice first — assistants are added to a practice.
        </p>
        <div className="flex gap-2">
          <Input
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value)}
            placeholder="Firm name"
            className="max-w-xs"
          />
          <Button
            size="sm"
            disabled={!practiceName.trim()}
            onClick={() => createPractice(practiceName.trim())}
          >
            Create practice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A Practice Management Assistant can see your patient list and calendar, and can create and
        assign tasks to the doctors of the practice and to patients. They cannot see clinical notes,
        prescriptions or documents — apart from hospital admission forms.
      </p>

      {assistants.length === 0 && pending.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No assistants yet. Invite one by email below.
        </p>
      )}

      {assistants.length > 0 && (
        <div className="space-y-2">
          {assistants.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserCog className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">{a.full_name || "Assistant"}</span>
                <Badge variant="secondary" className="shrink-0">
                  Active
                </Badge>
              </div>
              {isOwner && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => updateMemberRole(a.id, "member")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Make full member
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove assistant"
                    onClick={() => setConfirmRemove({ id: a.id, name: a.full_name || "this assistant" })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{i.invited_email}</span>
                <Badge variant="outline" className="shrink-0">
                  Pending
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => resendInvitation(i.id, i.invited_email)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setConfirmRevoke({ id: i.id, email: i.invited_email })}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="space-y-1.5">
          <Label htmlFor="pma-email">Invite an assistant by email</Label>
          <div className="flex gap-2">
            <Input
              id="pma-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="assistant@example.com"
              className="max-w-sm"
            />
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={busy || !emailValid || alreadyInvited}
              className="gap-1.5"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Invite Assistant
            </Button>
          </div>
          {email.trim() && !emailValid && (
            <p className="text-xs text-destructive">Enter a valid email address.</p>
          )}
          {alreadyInvited && (
            <p className="text-xs text-destructive">That email already has a pending invitation.</p>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assistant?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.name} will immediately lose access to your patient list, calendar and tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRemove) removeMember(confirmRemove.id);
                setConfirmRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation to {confirmRevoke?.email} will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRevoke) revokeInvitation(confirmRevoke.id);
                setConfirmRevoke(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
