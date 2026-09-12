/**
 * Admin > Performance — how the MVP is doing in a given country.
 * Sign-ups, activation, return visits and activity volumes per user.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPage } from "./_shared/AdminPage";
import { AdminPanel } from "./_shared/AdminPanel";
import { EmptyState } from "./_shared/EmptyState";

interface PerformanceRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  country: string;
  signed_up: string;
  last_sign_in: string | null;
  last_active: string | null;
  returned: boolean;
  activated: boolean;
  sessions_count: number;
  documents_count: number;
  prescriptions_count: number;
  appointments_count: number;
  checkins_count: number;
  incidents_count: number;
  login_days: number;
  minutes_active: number;
}

const COUNTRY_LABELS: Record<string, string> = {
  NG: "Nigeria",
  ZA: "South Africa",
  Unspecified: "Unspecified",
};

const countryLabel = (code: string) => COUNTRY_LABELS[code] ?? code;

const fmtDate = (value: string | null) =>
  value ? format(parseISO(value), "d MMM yyyy") : "—";

function daysSince(value: string | null) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

export default function CountryPerformance() {
  const [country, setCountry] = useState("NG");
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: countries = [] } = useQuery({
    queryKey: ["admin-country-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_country_list");
      if (error) throw error;
      return (data ?? []) as { country: string; users: number }[];
    },
  });

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-user-performance", country, from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_performance", {
        _country: country,
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return (data ?? []) as PerformanceRow[];
    },
  });

  const stats = useMemo(() => {
    const signups = rows.length;
    const activated = rows.filter((r) => r.activated).length;
    const returning = rows.filter((r) => r.returned).length;
    const active30 = rows.filter((r) => {
      const d = daysSince(r.last_active);
      return d !== null && d <= 30;
    }).length;
    const consultations = rows.reduce((sum, r) => sum + Number(r.sessions_count), 0);
    const dormant = rows.filter((r) => !r.returned).length;
    return { signups, activated, returning, active30, consultations, dormant };
  }, [rows]);

  const weekly = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = format(startOfWeek(parseISO(r.signed_up), { weekStartsOn: 1 }), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, signups]) => ({
        week: format(parseISO(week), "d MMM"),
        signups,
      }));
  }, [rows]);

  const exportCsv = () => {
    const header = [
      "Name", "Email", "Role", "Country", "Signed up", "Last active",
      "Returned", "Activated", "Consultations", "Documents", "Prescriptions",
      "Appointments", "Check-ins", "SOS", "Login days", "Minutes active",
    ];
    const lines = rows.map((r) => [
      r.full_name ?? "", r.email ?? "", r.role, countryLabel(r.country),
      fmtDate(r.signed_up), fmtDate(r.last_active),
      r.returned ? "Yes" : "No", r.activated ? "Yes" : "No",
      r.sessions_count, r.documents_count, r.prescriptions_count,
      r.appointments_count, r.checkins_count, r.incidents_count,
      r.login_days, r.minutes_active,
    ]);
    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-${country}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headline: { label: string; value: number | string }[] = [
    { label: "Sign-ups", value: stats.signups },
    { label: "Activated", value: stats.activated },
    { label: "Came back", value: stats.returning },
    { label: "Active last 30 days", value: stats.active30 },
    { label: "Consultations", value: stats.consultations },
    { label: "Never returned", value: stats.dormant },
  ];

  return (
    <AdminPage
      eyebrow="Insights"
      title="Performance"
      description="Sign-ups, activation and ongoing use, by country."
      actions={
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      }
    >
      <AdminPanel>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11.5px]">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 w-52 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.country} value={c.country}>
                    {countryLabel(c.country)} ({c.users})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11.5px]">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-40 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11.5px]">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-40 text-xs"
            />
          </div>
        </div>
      </AdminPanel>

      {error && (
        <AdminPanel>
          <p className="text-xs text-destructive">
            This report is only available to administrators.
          </p>
        </AdminPanel>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {headline.map((item) => (
          <AdminPanel key={item.label}>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--admin-text-tertiary))]">
              {item.label}
            </p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text-primary))]">
              {item.value}
            </p>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel title="Sign-ups per week">
        {weekly.length === 0 ? (
          <EmptyState title="No sign-ups in this period" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="People" description="Every account created in this period." noPadding>
        {isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="No accounts match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11.5px]">Name</TableHead>
                  <TableHead className="text-[11.5px]">Role</TableHead>
                  <TableHead className="text-[11.5px]">Signed up</TableHead>
                  <TableHead className="text-[11.5px]">Last active</TableHead>
                  <TableHead className="text-[11.5px]">Came back</TableHead>
                  <TableHead className="text-right text-[11.5px]">Consults</TableHead>
                  <TableHead className="text-right text-[11.5px]">Docs</TableHead>
                  <TableHead className="text-right text-[11.5px]">Scripts</TableHead>
                  <TableHead className="text-right text-[11.5px]">Appts</TableHead>
                  <TableHead className="text-right text-[11.5px]">Check-ins</TableHead>
                  <TableHead className="text-right text-[11.5px]">SOS</TableHead>
                  <TableHead className="text-right text-[11.5px]">Login days</TableHead>
                  <TableHead className="text-right text-[11.5px]">Minutes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="text-xs font-medium">
                      {r.full_name || r.email || "—"}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{r.role}</TableCell>
                    <TableCell className="text-xs">{fmtDate(r.signed_up)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(r.last_active)}</TableCell>
                    <TableCell className="text-xs">{r.returned ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right text-xs">{r.sessions_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.documents_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.prescriptions_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.appointments_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.checkins_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.incidents_count}</TableCell>
                    <TableCell className="text-right text-xs">{r.login_days}</TableCell>
                    <TableCell className="text-right text-xs">{r.minutes_active}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
