import { useEffect, useState } from "react";
import { Loader2, ExternalLink, FileText, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePendingProviderSubmission } from "@/features/admin/hooks/usePendingProviderSubmission";

interface Props {
  open: boolean;
  ownerUserId: string | null;
  onClose: () => void;
  onActioned?: () => void;
}

export function PendingProviderReviewDialog({ open, ownerUserId, onClose, onActioned }: Props) {
  const { toast } = useToast();
  const { data: submission, isLoading, refetch } = usePendingProviderSubmission(ownerUserId);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setLicenseUrl(null);
      setReason("");
      setRejecting(false);
    }
  }, [open]);

  const openLicense = async () => {
    if (!submission?.license_file_path) return;
    setSigningUrl(true);
    try {
      const { data, error } = await supabase.storage
        .from("provider-licenses")
        .createSignedUrl(submission.license_file_path, 60);
      if (error) throw error;
      setLicenseUrl(data.signedUrl);
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Could not open license", description: e.message, variant: "destructive" });
    } finally {
      setSigningUrl(false);
    }
  };

  const approve = async () => {
    if (!submission) return;
    setBusy(true);
    try {
      const rpcName =
        submission.kind === "hospital" ? "holarchelp_approve_hospital"
        : submission.kind === "insurance" ? "holarchelp_approve_insurer"
        : "holarchelp_approve_ambulance";
      const { error } = await supabase.rpc(rpcName as any, { _provider_id: submission.id } as any);
      if (error) throw error;
      toast({ title: "Approved", description: `${submission.org_name} is now active.` });
      onActioned?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Approval failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!submission) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("holarchelp_reject_provider" as any, {
        _provider_id: submission.id,
        _kind: submission.kind,
        _reason: reason.trim() || null,
      } as any);
      if (error) throw error;
      toast({ title: "Rejected", description: `${submission.org_name} marked rejected.` });
      onActioned?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Rejection failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending provider submission</DialogTitle>
          <DialogDescription>Review the submitted details and license before approving.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>
        ) : !submission ? (
          <div className="py-8 text-center text-muted-foreground">No pending submission found for this user.</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={submission.status === "pending" ? "default" : "outline"}>
                {submission.status}
              </Badge>
              <Badge variant="outline">{submission.kind === "hospital" ? "Hospital" : submission.kind === "insurance" ? "Insurance Company" : "Emergency Response"}</Badge>
            </div>

            <Section title="Administrator">
              <Field label="Name" value={submission.admin_full_name} />
              <Field label="Email" value={submission.admin_email} />
              <Field label="Phone" value={submission.admin_phone} />
            </Section>

            <Section title="Organisation">
              <Field label="Name" value={submission.org_name} />
              <Field label="Address" value={submission.address} />
              <Field label="License #" value={submission.registration_number} />
              <Field label="Org email" value={submission.contact_email} />
              <Field label="Org phone" value={submission.contact_phone} />
            </Section>

            <Section title={`Directors (${submission.directors.length})`}>
              <ul className="space-y-1">
                {submission.directors.length === 0 && <li className="text-muted-foreground">—</li>}
                {submission.directors.map((d, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{d.full_name}</span>
                    {d.role && <span className="text-muted-foreground"> — {d.role}</span>}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Certified license">
              {submission.license_file_path ? (
                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{submission.license_file_path.split("/").pop()}</p>
                      <p className="text-xs text-muted-foreground">
                        {submission.license_file_mime} · {submission.license_file_size_bytes
                          ? `${(submission.license_file_size_bytes / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={openLicense} disabled={signingUrl} className="gap-1.5">
                    {signingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Open
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No license file uploaded.</p>
              )}
            </Section>

            {submission.rejection_reason && (
              <Section title="Previous rejection">
                <p className="text-sm">{submission.rejection_reason}</p>
              </Section>
            )}

            {rejecting && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason for rejection (optional)</label>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Visible to admins only" />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          {submission && submission.status === "pending" && !rejecting && (
            <>
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejecting(true)} disabled={busy}>
                <XCircle className="h-4 w-4 mr-1.5" /> Reject
              </Button>
              <Button onClick={approve} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Approve</>}
              </Button>
            </>
          )}
          {rejecting && (
            <>
              <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>Cancel reject</Button>
              <Button variant="destructive" onClick={reject} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm rejection"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-xl border p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className="font-medium break-words">{value || "—"}</span>
    </div>
  );
}
