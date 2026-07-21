import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Activity, Pill, Phone, UserRound, Stethoscope, Droplet } from "lucide-react";
import { VoiceNoteAudio } from "./VoiceNoteAudio";
import { useTranslation } from "react-i18next";

type Ctx = {
  profile?: {
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
    blood_type?: string;
    mobile_number?: string;
    preferred_language?: string;
    allergies?: string[] | string | null;
    chronic_conditions?: string[] | string | null;
  };
  medications?: Array<{ medication?: string; dosage?: string; frequency?: string }>;
  emergency_contacts?: Array<{ name?: string; phone?: string; relationship?: string }>;
  voice_note_url?: string | null;
  voice_note_transcript?: string | null;
  ai_summary?: string | null;
  severity?: string | null;
  conscious?: boolean | null;
  breathing?: boolean | null;
  notes?: string | null;
  linked_providers?: Array<{ name?: string; specialty?: string }>;
};

const ageFromDob = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const asList = (v?: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          return String(item.name ?? item.condition ?? item.title ?? item.label ?? "").trim();
        }
        return String(item);
      })
      .filter(Boolean);
  }
  if (typeof v === "object") return asList([v]);
  return String(v).split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
};

export function EmergencyPatientContext({ incidentId }: { incidentId: string }) {
  const { t } = useTranslation();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_emergency_patient_context" as any, { _incident_id: incidentId });
      if (error) { setError(error.message); return; }
      setCtx((data as any) ?? {});
    })();
  }, [incidentId]);

  if (error) {
    return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>;
  }
  if (!ctx) {
    return <div className="rounded-2xl border bg-card p-3 text-xs text-muted-foreground">{t("emergencyContext.loading")}</div>;
  }

  const age = ageFromDob(ctx.profile?.date_of_birth);
  const allergies = asList(ctx.profile?.allergies);
  const conditions = asList(ctx.profile?.chronic_conditions);

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("emergencyContext.title")}</p>
        <span className="text-xs uppercase text-muted-foreground">{t("emergencyContext.permission")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Field icon={UserRound} label={t("emergencyContext.name")} value={ctx.profile?.full_name ?? "—"} />
        <Field label={t("emergencyContext.ageSex")} value={`${age ?? "—"}${ctx.profile?.gender ? " · " + ctx.profile.gender : ""}`} />
        <Field icon={Droplet} label={t("emergencyContext.blood")} value={ctx.profile?.blood_type ?? "—"} />
        <Field label={t("emergencyContext.language")} value={ctx.profile?.preferred_language ?? "—"} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Pill2 ok={ctx.conscious !== false} label={ctx.conscious === false ? t("ambulance.unconscious") : t("emergencyContext.conscious")} />
        <Pill2 ok={ctx.breathing !== false} label={ctx.breathing === false ? t("ambulance.notBreathing") : t("incomingSos.breathing")} />
        <Pill2 ok={(ctx.severity ?? "high") !== "critical"} label={(ctx.severity ?? "high").toUpperCase()} />
      </div>

      {ctx.ai_summary && (
        <div className="rounded-xl border bg-muted/40 p-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" /> {t("emergencyContext.aiSummary")}
          </p>
          <p className="text-xs leading-snug">{ctx.ai_summary}</p>
        </div>
      )}

      {(ctx.voice_note_url || ctx.voice_note_transcript) && (
        <div className="rounded-xl border bg-muted/40 p-2.5">
          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("emergencyContext.voiceClip")}</p>
          {ctx.voice_note_url && <VoiceNoteAudio path={ctx.voice_note_url} />}
          {ctx.voice_note_transcript && <p className="mt-1 text-xs italic text-muted-foreground">"{ctx.voice_note_transcript}"</p>}
        </div>
      )}

      <Section icon={AlertTriangle} label={t("emergencyContext.allergies")} tone="text-destructive">
        {allergies.length ? <Chips items={allergies} tone="destructive" /> : <Empty>{t("emergencyContext.noneRecorded")}</Empty>}
      </Section>

      <Section icon={Activity} label={t("emergencyContext.chronicConditions")}>
        {conditions.length ? <Chips items={conditions} /> : <Empty>{t("emergencyContext.noneRecorded")}</Empty>}
      </Section>

      <Section icon={Pill} label={t("emergencyContext.activeMedications")}>
        {ctx.medications?.length ? (
          <ul className="space-y-1 text-xs">
            {ctx.medications.slice(0, 10).map((m, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1 last:border-0">
                <span className="font-medium">{m.medication}</span>
                <span className="text-muted-foreground">{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>{t("emergencyContext.noActiveMedications")}</Empty>}
      </Section>

      <Section icon={Phone} label={t("emergencyContext.emergencyContacts")}>
        {ctx.emergency_contacts?.length ? (
          <ul className="space-y-1 text-xs">
            {ctx.emergency_contacts.map((c, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="font-medium">{c.name} <span className="text-muted-foreground font-normal">({c.relationship ?? t("emergencyContext.contact")})</span></span>
                {c.phone && <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>}
              </li>
            ))}
          </ul>
        ) : <Empty>{t("emergencyContext.noEmergencyContacts")}</Empty>}
      </Section>

      {!!ctx.linked_providers?.length && (
        <Section icon={Stethoscope} label={t("emergencyContext.linkedProviders")}>
          <ul className="text-xs text-muted-foreground">
            {ctx.linked_providers.map((p, i) => (
              <li key={i}>{p.name}{p.specialty ? ` · ${p.specialty}` : ""}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

const Field = ({ icon: Icon, label, value }: any) => (
  <div>
    <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="h-3 w-3" />}{label}
    </p>
    <p className="truncate text-sm font-semibold">{value}</p>
  </div>
);

const Pill2 = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`rounded-full border px-2 py-1 text-center font-semibold ${ok ? "border-green-500/40 bg-green-500/10 text-green-700" : "border-red-500/40 bg-red-500/10 text-red-700"}`}>{label}</span>
);

const Section = ({ icon: Icon, label, tone, children }: any) => (
  <div>
    <p className={`mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider ${tone ?? "text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
    {children}
  </div>
);

const Chips = ({ items, tone }: { items: string[]; tone?: "destructive" }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((it, i) => (
      <span key={i} className={`rounded-full border px-2 py-0.5 text-sm ${tone === "destructive" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted text-foreground"}`}>{it}</span>
    ))}
  </div>
);

const Empty = ({ children }: any) => <p className="text-xs text-muted-foreground">{children}</p>;
