import { useState } from "react";
import { Plus, Trash2, Upload, FileText, Building2, UserCog, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

export type ProviderKind = "hospital" | "esp" | "insurance" | "pharmacy";

export type InsuranceType = "life" | "disability_income" | "both" | "other";

export interface Director {
  full_name: string;
  role: string;
}

export interface ProviderVettingValues {
  // Organisation
  org_name: string;
  address: string;
  license_number: string;
  directors: Director[];
  org_phone: string;
  org_email: string;
  license_file: File | null;
  // Administrator (inherits-from-org via these flags)
  admin_full_name: string;
  admin_email: string;
  admin_email_same_as_org: boolean;
  admin_phone: string;
  admin_phone_same_as_org: boolean;
  // Account creation
  auto_gen_password: boolean;
  manual_password: string;
  send_email: boolean;
  // Insurance-only
  insurance_type: InsuranceType;
}

const directorSchema = z.object({
  full_name: z.string().trim().min(1, "Director name required").max(120),
  role: z.string().trim().max(120).optional().or(z.literal("")),
});

const e164 = z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number with country code");

export const providerVettingSchema = z.object({
  org_name: z.string().trim().min(2).max(200),
  address: z.string().trim().min(5).max(500),
  license_number: z.string().trim().min(2).max(120),
  directors: z.array(directorSchema).min(1, "At least one director required"),
  org_phone: e164,
  org_email: z.string().trim().email().max(255),
  admin_full_name: z.string().trim().min(2).max(120),
  admin_email: z.string().trim().email().max(255),
  admin_phone: e164,
  auto_gen_password: z.boolean(),
  manual_password: z.string(),
  send_email: z.boolean(),
});

export const defaultProviderVettingValues = (): ProviderVettingValues => ({
  org_name: "",
  address: "",
  license_number: "",
  directors: [{ full_name: "", role: "" }],
  org_phone: "",
  org_email: "",
  license_file: null,
  admin_full_name: "",
  admin_email: "",
  admin_email_same_as_org: false,
  admin_phone: "",
  admin_phone_same_as_org: false,
  auto_gen_password: true,
  manual_password: "",
  send_email: true,
  insurance_type: "other",
});

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_MB = 10;

interface Props {
  kind: ProviderKind;
  values: ProviderVettingValues;
  onChange: (v: ProviderVettingValues) => void;
  showAccountOptions?: boolean;
  disabled?: boolean;
  mode?: "public" | "admin";
}

export function ProviderVettingForm({ kind, values, onChange, showAccountOptions = true, disabled, mode = "admin" }: Props) {

  const [fileError, setFileError] = useState<string | null>(null);
  const orgLabel =
    kind === "hospital" ? "Hospital"
    : kind === "insurance" ? "Insurance Company"
    : kind === "pharmacy" ? "Pharmacy"
    : "ER / Ambulance service";
  const adminLabel =
    kind === "hospital" ? "Hospital Administrator"
    : kind === "insurance" ? "Insurer Administrator"
    : kind === "pharmacy" ? "Pharmacy Administrator"
    : "Service Administrator";
  const set = <K extends keyof ProviderVettingValues>(key: K, val: ProviderVettingValues[K]) =>
    onChange({ ...values, [key]: val });

  const updateDirector = (i: number, patch: Partial<Director>) => {
    const next = values.directors.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    set("directors", next);
  };
  const addDirector = () => set("directors", [...values.directors, { full_name: "", role: "" }]);
  const removeDirector = (i: number) => {
    if (values.directors.length === 1) return;
    set("directors", values.directors.filter((_, idx) => idx !== i));
  };

  const onFile = (f: File | null) => {
    setFileError(null);
    if (!f) { set("license_file", null); return; }
    if (!ACCEPTED_MIME.includes(f.type)) { setFileError("File must be PDF, JPG or PNG"); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setFileError(`File must be ≤ ${MAX_FILE_MB}MB`); return; }
    set("license_file", f);
  };

  // "Same as Hospital" mirroring — Administrator inherits from Organisation
  const updateOrgPhone = (v: string) => {
    onChange({
      ...values,
      org_phone: v,
      admin_phone: values.admin_phone_same_as_org ? v : values.admin_phone,
    });
  };
  const updateOrgEmail = (v: string) => {
    onChange({
      ...values,
      org_email: v,
      admin_email: values.admin_email_same_as_org ? v : values.admin_email,
    });
  };
  const toggleAdminEmailSame = (checked: boolean) => {
    onChange({
      ...values,
      admin_email_same_as_org: checked,
      admin_email: checked ? values.org_email : values.admin_email,
    });
  };
  const toggleAdminPhoneSame = (checked: boolean) => {
    onChange({
      ...values,
      admin_phone_same_as_org: checked,
      admin_phone: checked ? values.org_phone : values.admin_phone,
    });
  };

  const frameClass =
    "rounded-lg border-2 border-emerald-500/60 bg-emerald-50/40 dark:border-emerald-400/40 dark:bg-emerald-950/20 p-4 sm:p-5 space-y-4";
  const sectionHeaderClass =
    "flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300";

  return (
    <div className="space-y-5">
      {/* 1. HOSPITAL / ORGANISATION */}
      <section className={frameClass}>
        <h3 className={sectionHeaderClass}>
          <Building2 className="h-4 w-4" />
          {orgLabel} details
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor="org_name">{orgLabel} name</Label>
          <Input id="org_name" value={values.org_name} disabled={disabled}
            onChange={(e) => set("org_name", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Physical address</Label>
          <Textarea id="address" rows={2} value={values.address} disabled={disabled}
            onChange={(e) => set("address", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="license_number">License / registration number</Label>
          <Input id="license_number" value={values.license_number} disabled={disabled}
            onChange={(e) => set("license_number", e.target.value)} />
        </div>

        {kind === "insurance" && (
          <div className="space-y-1.5">
            <Label htmlFor="insurance_type">Insurance type</Label>
            <Select
              value={values.insurance_type}
              onValueChange={(v) => set("insurance_type", v as InsuranceType)}
              disabled={disabled}
            >
              <SelectTrigger id="insurance_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="life">Life insurance</SelectItem>
                <SelectItem value="disability_income">Disability income</SelectItem>
                <SelectItem value="both">Life & disability income</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Directors */}
        <div className="space-y-2">
          <Label>Directors</Label>
          {values.directors.map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input placeholder="Full name" value={d.full_name} disabled={disabled}
                onChange={(e) => updateDirector(i, { full_name: e.target.value })} />
              <Input placeholder="Role (optional)" value={d.role} disabled={disabled}
                onChange={(e) => updateDirector(i, { role: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" className="shrink-0"
                onClick={() => removeDirector(i)} disabled={disabled || values.directors.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDirector} disabled={disabled} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add director
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org_phone">{orgLabel} contact number</Label>
          <PhoneNumberInput id="org_phone" value={values.org_phone} disabled={disabled}
            onChange={updateOrgPhone} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org_email">{orgLabel} email</Label>
          <Input id="org_email" type="email" value={values.org_email} disabled={disabled}
            onChange={(e) => updateOrgEmail(e.target.value)} />
        </div>

        {/* License upload */}
        <div className="space-y-2 pt-1">
          <Label>Certified copy of license</Label>
          <p className="text-xs text-muted-foreground">PDF, JPG or PNG — max {MAX_FILE_MB}MB. Required for vetting.</p>
          {values.license_file ? (
            <div className="flex items-center justify-between rounded-lg border p-2.5 bg-background/60">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{values.license_file.name}</p>
                  <p className="text-xs text-muted-foreground">{(values.license_file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onFile(null)} disabled={disabled}>Remove</Button>
            </div>
          ) : (
            <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-emerald-500/40 p-3 cursor-pointer hover:bg-background/40">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload license file</span>
              <input
                type="file"
                accept=".pdf,application/pdf,image/jpeg,image/png"
                className="sr-only"
                disabled={disabled}
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
          {fileError && <p className="text-xs text-destructive">{fileError}</p>}
        </div>
      </section>

      {/* 2. ADMINISTRATOR */}
      <section className={frameClass}>
        <h3 className={sectionHeaderClass}>
          <UserCog className="h-4 w-4" />
          {adminLabel}
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor="admin_name">Full name</Label>
          <Input id="admin_name" value={values.admin_full_name} disabled={disabled}
            onChange={(e) => set("admin_full_name", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin_email">Email</Label>
          <Input id="admin_email" type="email" value={values.admin_email}
            disabled={disabled || values.admin_email_same_as_org}
            onChange={(e) => set("admin_email", e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={values.admin_email_same_as_org}
              onCheckedChange={(c) => toggleAdminEmailSame(!!c)}
              disabled={disabled}
            />
            Same as {orgLabel} email
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin_phone">Contact number</Label>
          <PhoneNumberInput
            id="admin_phone"
            value={values.admin_phone}
            disabled={disabled || values.admin_phone_same_as_org}
            onChange={(v) => set("admin_phone", v)}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={values.admin_phone_same_as_org}
              onCheckedChange={(c) => toggleAdminPhoneSame(!!c)}
              disabled={disabled}
            />
            Same as {orgLabel} contact number
          </label>
        </div>
      </section>

      {/* Account options */}
      {showAccountOptions && (
        <section className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold">Account options</h3>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Auto-generate password</p>
              <p className="text-xs text-muted-foreground">14 chars, mixed case + digits + symbols</p>
            </div>
            <Switch checked={values.auto_gen_password} onCheckedChange={(c) => set("auto_gen_password", c)} disabled={disabled} />
          </div>
          {!values.auto_gen_password && (
            <div className="space-y-1.5">
              <Label htmlFor="manual_pwd">Password</Label>
              <Input id="manual_pwd" value={values.manual_password} disabled={disabled}
                onChange={(e) => set("manual_password", e.target.value)} placeholder="Min 8 chars" />
            </div>
          )}
          {mode !== "public" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Email credentials to administrator</p>
                <p className="text-xs text-muted-foreground">Send the login + password by email</p>
              </div>
              <Switch checked={values.send_email} onCheckedChange={(c) => set("send_email", c)} disabled={disabled} />
            </div>
          )}

        </section>
      )}

      {/* 6-hour SLA banner */}
      <div className="rounded-md border border-emerald-500/40 bg-emerald-50/60 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200 text-sm p-3 flex gap-2 items-start">
        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          We aim to approve all applications within <strong>6 hours</strong>. You'll receive a
          confirmation email once submitted and a follow-up email once approved.
        </span>
      </div>
    </div>
  );
}
