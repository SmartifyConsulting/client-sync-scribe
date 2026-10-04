import { dobFromSaId } from "@/lib/saId";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, Loader2, Mic, Sparkles, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { safeInvoke } from "@/services/edge/safeInvoke";
import { FinancialInformation } from "@/features/patients/components/financial/FinancialInformation";

type Viewer = "manager" | "client";
const db = supabase as any;
const fmt = (d: string) => new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const refresh = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ["wealth-map-records"] });

/* ---------------- Step 1: personal information ---------------- */
export function PersonalInfoPanel({ patientId, personal }: { patientId?: string; personal: any }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setF({
      id_passport_number: personal?.id_passport_number ?? "", dob: personal?.dob ?? "",
      physical_address: personal?.physical_address ?? personal?.address ?? "", postal_address: personal?.postal_address ?? "",
      marital_status: personal?.marital_status ?? "", marital_regime: personal?.marital_regime ?? "",
      phone: personal?.phone ?? "",
    });
  }, [personal]);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const missing = [
    !f.id_passport_number && "ID or passport number", !f.dob && "date of birth",
    !f.physical_address && "residential address", !f.marital_status && "marital status",
  ].filter(Boolean) as string[];

  const save = async () => {
    if (!patientId) return;
    if (missing.length) return toast({ title: "A few details are missing", description: `Please add your ${missing.join(", ")}.`, variant: "destructive" });
    setBusy(true);
    const { error } = await db.from("patients").update({ ...f, address: f.physical_address, dob: f.dob || null }).eq("id", patientId);
    setBusy(false);
    if (error) return toast({ title: "Couldn't save your details", description: "Please try again. If it keeps happening, contact your Wealth Manager.", variant: "destructive" });
    toast({ title: "Personal information saved" });
    refresh(qc);
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Personal information</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ID or passport number *"><Input value={f.id_passport_number ?? ""} onChange={(e) => { const v = e.target.value; const dob = dobFromSaId(v); setF((x) => ({ ...x, id_passport_number: v, ...(dob ? { dob } : {}) })); }} /></Field>
        <Field label="Date of birth *"><Input type="date" value={f.dob ?? ""} onChange={(e) => set("dob")(e.target.value)} /></Field>
        <Field label="Mobile number"><Input value={f.phone ?? ""} onChange={(e) => set("phone")(e.target.value)} /></Field>
        <Field label="Marital status *">
          <Select value={f.marital_status ?? ""} onValueChange={set("marital_status")}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["Single", "Married", "Life partner", "Divorced", "Widowed"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {f.marital_status === "Married" && (
          <Field label="Marital regime">
            <Select value={f.marital_regime ?? ""} onValueChange={set("marital_regime")}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["In community of property", "Out of community with accrual", "Out of community without accrual"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Residential address *" wide><Textarea rows={2} value={f.physical_address ?? ""} onChange={(e) => set("physical_address")(e.target.value)} /></Field>
        <Field label="Postal address (if different)" wide><Textarea rows={2} value={f.postal_address ?? ""} onChange={(e) => set("postal_address")(e.target.value)} /></Field>
      </div>
      <Button className="w-full rounded-full" onClick={save} disabled={busy || !patientId}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save and continue
      </Button>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}><Label className="text-xs">{label}</Label>{children}</div>;
}

/* ---------------- Step 2 · schedule meeting ---------------- */
export function ScheduleMeetingPanel({ appointments, viewer }: { appointments: any[]; viewer: Viewer }) {
  const next = [...appointments].sort((a, b) => a.start_time.localeCompare(b.start_time)).find((a) => new Date(a.start_time) >= new Date(Date.now() - 864e5)) ?? appointments[0];
  return (
    <div className="space-y-3 text-sm">
      {next ? (
        <p className="rounded-lg bg-muted/50 p-3 text-xs">Meeting booked: <span className="font-medium">{fmt(next.start_time)}</span></p>
      ) : (
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          {viewer === "client" ? "No meeting booked yet. Your Wealth Manager will be in touch." : "No meeting booked yet."}
        </p>
      )}
      {viewer === "manager" && (
        <Button asChild variant="outline" className="w-full rounded-full">
          <Link to="/calendar"><CalendarPlus className="mr-2 h-4 w-4" />{next ? "Change meeting" : "Book meeting"}</Link>
        </Button>
      )}
    </div>
  );
}

/* ---------------- Record meeting (Wealth Manager) ---------------- */
function RecordMeeting({ patientId, onDone }: { patientId: string; onDone: (sessionId: string) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timer.current);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setBusy(true);
        const { data: sess } = await supabase.auth.getSession();
        const fd = new FormData();
        fd.append("patientId", patientId);
        fd.append("file", blob, "meeting.webm");
        try {
          const r = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/transcribe-meeting`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sess.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: fd,
          });
          const out = await r.json().catch(() => ({}));
          if (!r.ok || !out.sessionId) throw new Error(out.error ?? "We couldn't process the recording. Please try again.");
          onDone(out.sessionId);
        } catch (e: any) {
          toast({ title: "Recording not processed", description: e.message, variant: "destructive" });
        } finally { setBusy(false); setRec(null); }
      };
      mr.start(1000);
      setRec(mr); setSecs(0);
      timer.current = window.setInterval(() => setSecs((x) => x + 1), 1000);
    } catch {
      toast({ title: "Microphone not available", description: "Allow microphone access in your browser, then try again.", variant: "destructive" });
    }
  };

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  if (busy) return <Button disabled className="w-full rounded-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Transcribing and capturing…</Button>;
  return rec ? (
    <Button variant="destructive" className="w-full rounded-full" onClick={() => rec.stop()}>
      <Square className="mr-2 h-4 w-4" />Stop recording · {mmss}
    </Button>
  ) : (
    <Button className="w-full rounded-full" onClick={start}><Mic className="mr-2 h-4 w-4" />Record meeting</Button>
  );
}

/* ---------------- Step 2a: capture from consultation (Wealth Manager) ---------------- */
export function CaptureFinancialsPanel({ patientId, sessions, financials, viewer, clientFirst }: { patientId?: string; sessions: any[]; financials: any; viewer: Viewer; clientFirst: string }) {
  const qc = useQueryClient();
  const usable = sessions.filter((s) => s.hasText);
  const [sessionId, setSessionId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!sessionId && usable[0]) setSessionId(usable[0].id); }, [usable.length]);

  if (viewer === "client") {
    return (
      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        {financials?.extracted_at ? `Captured ${fmt(financials.extracted_at)}. You'll be asked to check it next.` : "Your Wealth Manager will capture your financial information after your meeting."}
      </p>
    );
  }

  const run = async (sid?: string) => {
    if (!patientId) return;
    setBusy(true);
    const { data, error } = await safeInvoke<any>("extract-financials", sid ? { patientId, sessionId: sid } : notes.trim() ? { patientId, text: notes } : { patientId, sessionId });
    setBusy(false);
    const msg = (data as any)?.error ?? error;
    if (msg || !data?.ok) return toast({ title: "Couldn't capture the financial information", description: msg ?? "Please try again.", variant: "destructive" });
    toast({ title: "Financial information captured", description: `Check it below, then ${clientFirst} verifies it.` });
    refresh(qc);
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Record the meeting</p>
      {patientId && <RecordMeeting patientId={patientId} onDone={(sid) => { setSessionId(sid); refresh(qc); run(sid); }} />}
      <p className="text-2xs text-muted-foreground">Elysian AI transcribes the meeting and fills in the financial information automatically.</p>
      <p className="pt-2 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Or capture from an earlier consultation</p>
      {usable.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Recorded consultation</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Choose a consultation" /></SelectTrigger>
            <SelectContent>{usable.map((s) => <SelectItem key={s.id} value={s.id}>{s.title || "Consultation"} · {fmt(s.created_at)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">{usable.length ? "Or paste meeting notes" : "No recorded consultation yet. Paste meeting notes"}</Label>
        <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Earns R65,000 gross, bond of R1.2m on the house…" />
      </div>
      <Button className="w-full rounded-full" onClick={() => run()} disabled={busy || (!sessionId && !notes.trim())}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {financials?.extracted_at ? "Capture again" : "Capture financial information"}
      </Button>
      {financials?.extracted_at && (
        <>
          <p className="text-xs text-muted-foreground">Last captured {fmt(financials.extracted_at)}. Check and correct it before {clientFirst} verifies.</p>
          {patientId && <FinancialInformation patientId={patientId} />}
        </>
      )}
    </div>
  );
}

/* ---------------- Step 2b: client verifies complete & correct ---------------- */
export function VerifyFinancialsPanel({ patientId, financials, viewer, clientFirst }: { patientId?: string; financials: any; viewer: Viewer; clientFirst: string }) {
  const qc = useQueryClient();
  const [complete, setComplete] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [busy, setBusy] = useState(false);

  if (financials?.verified_at) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        {viewer === "client" ? "You" : clientFirst} confirmed this information is complete and correct on {fmt(financials.verified_at)}.
      </p>
    );
  }
  if (viewer === "manager") {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Waiting for {clientFirst} to confirm the information is complete and correct. If you change anything, they confirm again.</p>
        {patientId && <FinancialInformation patientId={patientId} />}
      </div>
    );
  }

  const verify = async () => {
    if (!patientId) return;
    setBusy(true);
    const { error } = await db.rpc("wealth_financials_verify", { _patient_id: patientId });
    setBusy(false);
    if (error) return toast({ title: "Couldn't record your confirmation", description: error.message, variant: "destructive" });
    toast({ title: "Thank you. Your financial information is confirmed." });
    refresh(qc);
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Captured from your meeting</p>
      <p className="text-xs text-muted-foreground">Open each section, correct anything that's wrong and press Save. Then confirm below.</p>
      {patientId && <FinancialInformation patientId={patientId} />}
      <div className="space-y-2 rounded-lg border border-border/70 p-3">
        <label className="flex items-start gap-2 text-xs"><Checkbox checked={complete} onCheckedChange={(v) => setComplete(!!v)} className="mt-0.5" />I confirm this financial information is <strong>complete</strong>. Nothing important is missing.</label>
        <label className="flex items-start gap-2 text-xs"><Checkbox checked={correct} onCheckedChange={(v) => setCorrect(!!v)} className="mt-0.5" />I confirm the figures, assets and debts above are <strong>correct</strong>.</label>
      </div>
      <Button className="w-full rounded-full" onClick={verify} disabled={busy || !complete || !correct}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm my financial information
      </Button>
    </div>
  );
}
