import { useState } from "react";
import { Plus, Trash2, Mail, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePractice } from "@/hooks/usePractice";

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
    removeMember,
    revokeInvitation,
    createPractice,
  } = usePractice();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [practiceName, setPracticeName] = useState("");

  const assistants = members.filter((m) => m.role === "assistant");
  const pending = invitations.filter(
    (i) => i.status === "pending" && (i as any).invited_role === "assistant",
  );

  const handleInvite = async () => {
    if (!email.trim()) return;
    setBusy(true);
    await inviteMember(email, "assistant");
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
            placeholder="Practice name"
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

      {assistants.length > 0 && (
        <div className="space-y-2">
          {assistants.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserCog className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate text-sm font-medium">
                  {a.full_name || "Assistant"}
                </span>
                <Badge variant="secondary" className="shrink-0">Assistant</Badge>
              </div>
              {isOwner && (
                <Button variant="ghost" size="icon" onClick={() => removeMember(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
              className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm">{i.invited_email}</span>
                <Badge variant="outline" className="shrink-0">Pending</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => revokeInvitation(i.id)}>
                Revoke
              </Button>
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
              placeholder="assistant@example.com"
              className="max-w-sm"
            />
            <Button size="sm" onClick={handleInvite} disabled={busy || !email.trim()} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Invite Assistant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
