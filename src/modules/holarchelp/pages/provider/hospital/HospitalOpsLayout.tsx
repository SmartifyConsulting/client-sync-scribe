import { ProviderAppLayout } from "@/components/layout/ProviderAppLayout";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalOpsStats } from "../../../hooks/useHospitalOpsStats";
import { useHospitalRole, ROLE_LABEL, ROLE_TONE } from "../../../hooks/useHospitalRole";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function TopChip({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/5 px-3 py-1.5 shadow-sm", tone)}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
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
      ? "bg-destructive/10 text-destructive"
      : stats.capacityStatus === "yellow"
        ? "bg-warning/10 text-warning-foreground"
        : "bg-success/10 text-success";

  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/50 bg-card/60 p-2 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {role && (
        <span
          title="Your role on this hospital account"
          className={cn(
            "flex shrink-0 items-center whitespace-nowrap rounded-full border border-black/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
            ROLE_TONE[role] ?? "bg-card text-foreground",
          )}
        >
          {ROLE_LABEL[role] ?? role}
        </span>
      )}
      <TopChip label={t("hospital.liveQueue")} value={stats.activeEmergencies} tone="bg-sos/10 text-sos" />
      <TopChip label={t("nav.incomingEr")} value={stats.incomingAmbulances} tone="bg-primary/10 text-primary" />
      <TopChip label={t("capacity.erBeds")} value={stats.erBedsAvailable ?? "—"} tone="bg-card text-foreground" />
      <TopChip label={t("capacity.icuBeds")} value={stats.icuAvailable ?? "—"} tone="bg-card text-foreground" />
      <TopChip label={t("capacity.title")} value={t(`capacity.${stats.capacityStatus ?? "green"}`)} tone={capTone} />
      <TopChip label={t("topbar.notifications")} value={stats.alerts} tone="bg-warning/10 text-warning" />
    </div>
  );
}

export default function HospitalOpsLayout() {
  return <ProviderAppLayout portal="hospital" statsStrip={<HospitalStatsStrip />} />;
}
