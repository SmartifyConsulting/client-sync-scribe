import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldCheck, Award, Clock, LogOut } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
} from "@/components/ui/section-accordion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldRow, FIELD_GRID_CLASS } from "@/components/ui/FieldRow";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNurseWard } from "@/modules/holarchelp/hooks/useNurseWard";
import { useHospitalInpatients } from "@/modules/holarchelp/hooks/useHospitalInpatients";
import { useMyShifts } from "@/modules/holarchelp/hooks/useHospitalShifts";
import { formatTimeRange } from "@/modules/holarchelp/lib/hospitalWards";

type NurseRow = Record<string, any>;

const NURSING_CATEGORIES = ["Registered Nurse", "Enrolled Nurse", "Enrolled Nursing Auxiliary"];

/** Ordered clinical permission lines shown read-only to the nurse. */
const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: "scope_of_practice", label: "Scope of practice" },
  { key: "wards", label: "Wards / departments authorised" },
  { key: "patient_groups", label: "Patient groups authorised" },
  { key: "medication_administration", label: "Medication administration" },
  { key: "iv_infusion", label: "IV / infusion" },
  { key: "procedures", label: "Procedures" },
  { key: "assessments", label: "Assessments" },
  { key: "escalation", label: "Escalation" },
];

function daysUntil(date?: string | null) {
  if (!date) return null;
  return Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function expiryStatus(date?: string | null): { label: string; className: string } {
  const d = daysUntil(date);
  if (d === null) return { label: "NOT RECORDED", className: "bg-neutral-200 text-neutral-700" };
  if (d < 0) return { label: "EXPIRED", className: "bg-red-100 text-red-800 border border-red-300" };
  if (d <= 90) return { label: "EXPIRING SOON", className: "bg-amber-100 text-amber-900 border border-amber-300" };
  return { label: "ACTIVE", className: "bg-sky-50 text-primary border border-primary/40" };
}

function certStatus(date?: string | null) {
  const s = expiryStatus(date);
  return s.label === "ACTIVE" ? { ...s, label: "CURRENT" } : s;
}

function permissionPill(status: string) {
  switch (status) {
    case "authorised":
      return { label: "AUTHORISED", className: "bg-sky-50 text-primary border border-primary/40" };
    case "requires_supervision":
      return { label: "REQUIRES SUPERVISION", className: "bg-amber-100 text-amber-900 border border-amber-300" };
    default:
      return { label: "NOT AUTHORISED", className: "bg-red-100 text-red-800 border border-red-300" };
  }
}

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${className}`}>
      {label}
    </span>
  );
}

/** A nurse's own profile: who she is, what she may do, what she is responsible
 *  for. Never shows patient clinical information. */
export default function NurseProfile() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { assignment, loading: wardLoading } = useNurseWard();
  const { inpatients } = useHospitalInpatients(assignment?.hospitalId ?? null);
  const { current } = useMyShifts(user?.id);

  const [nurse, setNurse] = useState<NurseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certs, setCerts] = useState<NurseRow[]>([]);
  const [perms, setPerms] = useState<NurseRow[]>([]);

  const nurseId = assignment?.nurseId ?? null;

  useEffect(() => {
    if (!nurseId) {
      if (!wardLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: row }, { data: c }, { data: p }] = await Promise.all([
        supabase.from("hospital_nurses").select("*").eq("id", nurseId).maybeSingle(),
        supabase.from("nurse_certifications" as any).select("*").eq("nurse_id", nurseId).order("expires_on"),
        supabase.from("nurse_clinical_permissions" as any).select("*").eq("nurse_id", nurseId),
      ]);
      if (cancelled) return;
      setNurse(row ?? null);
      setCerts((c as any[]) ?? []);
      setPerms((p as any[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nurseId, wardLoading]);

  const set = (field: string, value: any) => setNurse((n) => (n ? { ...n, [field]: value } : n));

  const save = async (fields: string[]) => {
    if (!nurse || !nurseId) return;
    setSaving(true);
    const payload: Record<string, any> = {};
    fields.forEach((f) => (payload[f] = nurse[f] === "" ? null : nurse[f]));
    const { error } = await supabase.from("hospital_nurses").update(payload).eq("id", nurseId);
    setSaving(false);
    toast(
      error
        ? { title: "Could not save", description: error.message, variant: "destructive" }
        : { title: "Saved" },
    );
  };

  const surname = (nurse?.full_name || profile?.full_name || "").split(" ").slice(-1)[0];
  const wardPatients = useMemo(
    () =>
      assignment?.wardId
        ? inpatients.filter((p: any) => p.ward_id === assignment.wardId && !p.discharged_at)
        : [],
    [inpatients, assignment?.wardId],
  );
  const myPatients = useMemo(
    () => wardPatients.filter((p: any) => p.nurses?.some((n: any) => n.nurse_id === nurseId && !n.released_at)),
    [wardPatients, nurseId],
  );

  const regStatus = expiryStatus(nurse?.registration_expiry);

  const list = (v: any) => (Array.isArray(v) ? v.join(", ") : v ?? "");
  const toList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  const signOutOthers = async () => {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    toast(
      error
        ? { title: "Could not sign out other devices", description: error.message, variant: "destructive" }
        : { title: "Signed out of all other devices" },
    );
  };

  if (loading || wardLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!nurse) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        You aren't on a hospital nursing roster yet. Ask your ward manager to add you.
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-4">
      {/* Header */}
      <div className="rounded-xl border border-primary bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Nurse Profile</p>
        <div className="mt-2 flex items-center gap-3">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={nurse.full_name ?? "Nurse"} />
            <AvatarFallback>{(nurse.full_name ?? "N").slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold text-foreground">
              Good day, Nurse {surname || nurse.full_name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {nurse.nursing_category || nurse.role_title || "Nurse"}
              {assignment?.wardName ? ` · ${assignment.wardName}` : ""}
              {assignment?.hospitalName ? ` · ${assignment.hospitalName}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Active
            </p>
          </div>
          {saving && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={[]} className={SECTION_FRAME_CLASS}>
        {/* About Me */}
        <AccordionItem value="about" className={`${SECTION_ITEM_CLASS} hidden`}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">About Me</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <Textarea
              rows={4}
              value={nurse.about_me ?? ""}
              onChange={(e) => set("about_me", e.target.value)}
              placeholder="A short professional introduction."
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => save(["about_me"])}>Save</Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Personal Information */}
        <AccordionItem value="personal" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Personal Information</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className={FIELD_GRID_CLASS}>
              <FieldRow label="Full name">
                <Input className="h-8" value={nurse.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
              </FieldRow>
              <FieldRow label="Preferred name">
                <Input className="h-8" value={nurse.preferred_name ?? ""} onChange={(e) => set("preferred_name", e.target.value)} />
              </FieldRow>
              <FieldRow label="Title">
                <Input className="h-8" value={nurse.professional_title ?? ""} onChange={(e) => set("professional_title", e.target.value)} />
              </FieldRow>
              <FieldRow label="Staff ID">
                <Input className="h-8" value={nurse.staff_id ?? ""} onChange={(e) => set("staff_id", e.target.value)} />
              </FieldRow>
              <FieldRow label="Reg. number">
                <Input className="h-8" value={nurse.nurse_registration_number ?? ""} onChange={(e) => set("nurse_registration_number", e.target.value)} />
              </FieldRow>
              <FieldRow label="Email">
                <Input className="h-8" value={nurse.email ?? user?.email ?? ""} onChange={(e) => set("email", e.target.value)} />
              </FieldRow>
              <FieldRow label="Mobile">
                <Input className="h-8" value={nurse.mobile_number ?? ""} onChange={(e) => set("mobile_number", e.target.value)} />
              </FieldRow>
              <FieldRow label="Facility">
                <Input className="h-8" disabled value={assignment?.hospitalName ?? ""} />
              </FieldRow>
              <FieldRow label="Ward">
                <Input className="h-8" disabled value={assignment?.wardName ?? "Not assigned"} />
              </FieldRow>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() =>
                  save(["full_name", "preferred_name", "professional_title", "staff_id", "nurse_registration_number", "email", "mobile_number"])
                }
              >
                Save
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Professional Information */}
        <AccordionItem value="professional" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Professional Information</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold">Registration status</span>
              <StatusPill {...regStatus} />
            </div>
            <div className={FIELD_GRID_CLASS}>
              <FieldRow label="Category">
                <Select value={nurse.nursing_category ?? ""} onValueChange={(v) => set("nursing_category", v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {NURSING_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Authority">
                <Input className="h-8" value={nurse.registration_authority ?? ""} onChange={(e) => set("registration_authority", e.target.value)} />
              </FieldRow>
              <FieldRow label="Reg. expiry">
                <Input className="h-8" type="date" value={nurse.registration_expiry ?? ""} onChange={(e) => set("registration_expiry", e.target.value)} />
              </FieldRow>
              <FieldRow label="Experience">
                <Input
                  className="h-8"
                  type="number"
                  value={nurse.years_experience ?? ""}
                  onChange={(e) => set("years_experience", e.target.value === "" ? null : Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Clinical areas" wide>
                <Input className="h-8" value={list(nurse.clinical_areas)} onChange={(e) => set("clinical_areas", toList(e.target.value))} placeholder="Comma separated" />
              </FieldRow>
              <FieldRow label="Specialisations" wide>
                <Input className="h-8" value={list(nurse.specialisations)} onChange={(e) => set("specialisations", toList(e.target.value))} placeholder="Comma separated" />
              </FieldRow>
              <FieldRow label="Languages" wide>
                <Input className="h-8" value={list(nurse.languages)} onChange={(e) => set("languages", toList(e.target.value))} placeholder="Comma separated" />
              </FieldRow>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() =>
                  save(["nursing_category", "registration_authority", "registration_expiry", "years_experience", "clinical_areas", "specialisations", "languages"])
                }
              >
                Save
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment */}
        <AccordionItem value="employment" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Employment</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className={FIELD_GRID_CLASS}>
              <FieldRow label="Facility">
                <Input className="h-8" disabled value={assignment?.hospitalName ?? ""} />
              </FieldRow>
              <FieldRow label="Department">
                <Input className="h-8" value={nurse.department ?? ""} onChange={(e) => set("department", e.target.value)} />
              </FieldRow>
              <FieldRow label="Ward">
                <Input className="h-8" disabled value={assignment?.wardName ?? "Not assigned"} />
              </FieldRow>
              <FieldRow label="Position">
                <Input className="h-8" value={nurse.position ?? ""} onChange={(e) => set("position", e.target.value)} />
              </FieldRow>
              <FieldRow label="Manager">
                <Input className="h-8" value={nurse.reporting_manager ?? ""} onChange={(e) => set("reporting_manager", e.target.value)} />
              </FieldRow>
              <FieldRow label="Status">
                <Input className="h-8" value={nurse.employment_status ?? ""} onChange={(e) => set("employment_status", e.target.value)} placeholder="Permanent / Contract" />
              </FieldRow>
              <FieldRow label="Start date">
                <Input className="h-8" type="date" value={nurse.employment_start_date ?? ""} onChange={(e) => set("employment_start_date", e.target.value)} />
              </FieldRow>
            </div>
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => save(["department", "position", "reporting_manager", "employment_status", "employment_start_date"])}>
                Save
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Clinical Permissions */}
        <AccordionItem value="permissions" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Clinical Permissions</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Your clinical permissions determine which clinical functions and patient information you can access
              within Holarc. They are set by your hospital administrator and are read-only here.
            </p>
            <div className="rounded-xl border border-neutral-400 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
                <span>Role</span>
                <span>{nurse.role_title || nurse.nursing_category || "Nurse"}</span>
              </div>
              <ul className="space-y-2 p-2">
                {PERMISSION_KEYS.map(({ key, label }) => {
                  const row = perms.find((p) => p.permission_key === key);
                  const pill = permissionPill(row?.status ?? "not_authorised");
                  return (
                    <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="flex items-center gap-2">
                        {row?.notes && <span className="text-muted-foreground">{row.notes}</span>}
                        <StatusPill {...pill} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Certifications & Training */}
        <AccordionItem value="certifications" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Certifications &amp; Training</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            {certs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No certifications captured yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {certs.map((c) => {
                  const s = certStatus(c.expires_on);
                  return (
                    <Card key={c.id} className="rounded-xl border border-primary bg-card p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Award className="h-3.5 w-3.5 text-primary" /> {c.name}
                        </p>
                        <StatusPill {...s} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.issuer || "—"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Obtained {c.obtained_on || "—"} · Expires {c.expires_on || "—"}
                      </p>
                      {c.verified_at && (
                        <Badge variant="outline" className="mt-2 text-[10px]">Verified</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Certificates are verified and approved by your hospital administrator.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Current Assignment */}
        <AccordionItem value="assignment" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Current Assignment</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Current ward", value: assignment?.wardName ?? "Not assigned" },
                { label: "Shift", value: current ? "On duty" : "Not on duty" },
                {
                  label: "Shift time",
                  value: current ? formatTimeRange(current.starts_at, current.ends_at) : "—",
                },
                { label: "Patients assigned", value: String(myPatients.length) },
                { label: "Patients in ward", value: String(wardPatients.length) },
                {
                  label: "Requiring attention",
                  value: String(wardPatients.filter((p: any) => p.priority === "high" || p.requires_attention).length),
                },
              ].map((s) => (
                <Card key={s.label} className="rounded-xl border border-primary bg-card p-5">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> {s.label}
                  </p>
                  <p className="mt-1 text-lg font-bold">{s.value}</p>
                </Card>
              ))}
            </div>
            <div className="mt-3">
              <Button asChild size="sm">
                <Link to="/provider/hospital/nurse-dashboard">View My Patients</Link>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Preferences */}
        <AccordionItem value="preferences" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Preferences</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className={FIELD_GRID_CLASS}>
              <FieldRow label="Language">
                <Input className="h-8" disabled value={profile?.preferred_language ?? "English"} />
              </FieldRow>
              <FieldRow label="Narration">
                <Input className="h-8" disabled value={profile?.narration_voice ?? "Default voice"} />
              </FieldRow>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Notification, communication, appearance and accessibility preferences are managed in Settings.
            </p>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Open Settings</Link>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Security & Access */}
        <AccordionItem value="security" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}><h3 className="text-xs font-semibold text-primary-dark">Security &amp; Access</h3></AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className={FIELD_GRID_CLASS}>
              <FieldRow label="Last login">
                <Input
                  className="h-8"
                  disabled
                  value={
                    user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"
                  }
                />
              </FieldRow>
              <FieldRow label="Sign-in email">
                <Input className="h-8" disabled value={user?.email ?? ""} />
              </FieldRow>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Password &amp; two-factor</Link>
              </Button>
              <Button size="sm" variant="destructive" onClick={signOutOthers}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out of all other devices
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
