import { ProviderAppLayout } from "@/components/layout/ProviderAppLayout";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalOpsStats } from "../../../hooks/useHospitalOpsStats";
import { useHospitalRole, ROLE_LABEL, ROLE_TONE } from "../../../hooks/useHospitalRole";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function TopChip({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-1.5", tone)}>
      <span className="text-sm font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-sm font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function HospitalStatsStrip() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const { stats } = useHospitalOpsStats(providerId);
  const { role } = useHospitalRole(providerId);

  const capTone =
    stats.capacityStatus === "red"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : stats.capacityStatus === "yellow"
        ? "border-warning/40 bg-warning/10 text-warning-foreground"
        : "border-success/40 bg-success/10 text-success";

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card/60 p-2">
      {role && (
        <span className={cn("rounded-xl border px-2.5 py-1.5 text-sm font-bold uppercase tracking-wider", ROLE_TONE[role] ?? "border-border bg-card text-foreground")}>
          {ROLE_LABEL[role] ?? role}
        </span>
      )}
      <TopChip label={t("hospital.liveQueue")} value={stats.activeEmergencies} tone="border-sos/40 bg-sos/10 text-sos" />
      <TopChip label={t("nav.incomingEr")} value={stats.incomingAmbulances} tone="border-primary/40 bg-primary/10 text-primary" />
      <TopChip label={t("capacity.icuBeds")} value={stats.icuAvailable ?? "â€”"} tone="border-border bg-card text-foreground" />
      <TopChip label={t("capacity.title")} value={t(`status.${stats.capacityStatus ?? "green"}`)} tone={capTone} />
      <TopChip label={t("topbar.notifications")} value={stats.alerts} tone="border-warning/40 bg-warning/10 text-warning" />
    </div>
  );
}

export default function HospitalOpsLayout() {
  return <ProviderAppLayout portal="hospital" statsStrip={<HospitalStatsStrip />} />;
}

