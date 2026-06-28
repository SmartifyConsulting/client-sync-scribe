import i18n from "@/i18n";

export function relativeTimeLabel(input: Date | string | number): string {
  const t = (k: string, opts?: Record<string, unknown>) => i18n.t(k, opts as any) as string;
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return t("recentActivity.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("recentActivity.minsAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("recentActivity.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day === 1) return t("recentActivity.yesterday");
  if (day < 7) return t("recentActivity.daysAgo", { count: day });
  const wk = Math.floor(day / 7);
  if (wk < 4) return t("recentActivity.weeksAgo", { count: wk });
  return d.toLocaleDateString();
}
