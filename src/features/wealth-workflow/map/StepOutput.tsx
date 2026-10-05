import { CheckCircle2, FileText } from "lucide-react";

const R = (n?: number | null) => (n == null ? "—" : `R ${Math.round(Number(n)).toLocaleString("en-ZA")}`);
const D = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </li>
  );
}

/** Summary of what a step produced, shown at the end of its frame in the Live Workspace. */
export function StepOutput({ groupKey, records, recs }: { groupKey: string; records: any; recs: any[] }) {
  if (!records) return null;
  let rows: React.ReactNode = null;

  if (groupKey === "gateway") {
    const p = records.personal ?? {};
    const signed: any[] = records.signed ?? [];
    rows = (<>
      <Row label="Personal information" value={records.personalDone ? "Complete" : "Outstanding"} />
      <Row label="ID number" value={p.id_passport_number ?? "—"} />
      <Row label="KYC, AML & PEP" value={records.kyc?.status ? String(records.kyc.status).replace(/_/g, " ") : "Not started"} />
      {signed.map((d) => <Row key={d.id} label={d.title ?? d.doc_type} value={`Signed ${D(d.signed_at)}`} />)}
    </>);
  } else if (groupKey === "needs") {
    const f = records.financials ?? {};
    const s = (records.sessions ?? []).find((x: any) => x.hasText);
    rows = (<>
      <Row label="Meeting transcript" value={s ? `${s.title ?? "Consultation"} · ${D(s.created_at)}` : "None yet"} />
      <Row label="Financial information captured" value={f.extracted_at ? D(f.extracted_at) : "—"} />
      <Row label="Confirmed by client" value={f.verified_at ? D(f.verified_at) : "Awaiting"} />
    </>);
  } else if (groupKey === "portfolio") {
    const h: any[] = records.holdings ?? [];
    rows = h.length ? h.map((x) => <Row key={x.id} label={`${x.provider} · ${x.product ?? ""}`} value={R(x.premium)} />)
      : <Row label="Existing policies" value="None found" />;
  } else if (groupKey === "quotes") {
    const q: any[] = records.quotes ?? [];
    const types = Array.from(new Set(q.map((x) => x.cover_type ?? "General")));
    const sel = q.filter((x) => x.selected);
    const latest = recs.find((r) => r.status !== "superseded");
    rows = (<>
      {types.map((t) => {
        const chosen = sel.find((x) => (x.cover_type ?? "General") === t);
        const n = q.filter((x) => (x.cover_type ?? "General") === t).length;
        return <Row key={t} label={`${t} (${n} quotes)`} value={chosen ? `${chosen.insurer} · ${R(chosen.monthly_premium)}` : "Not selected"} />;
      })}
      {sel.length > 0 && <Row label="Total selected premium" value={R(sel.reduce((a, x) => a + Number(x.monthly_premium || 0), 0))} />}
      <Row label="Record of Advice" value={latest ? `Version ${latest.version} · ${String(latest.status).replace(/_/g, " ")}` : "Not drafted"} />
    </>);
  } else if (groupKey === "presentation") {
    const latest = recs.find((r) => r.status !== "superseded");
    rows = (<>
      <Row label="Record of Advice" value={latest ? `Version ${latest.version}` : "—"} />
      <Row label="Client decision" value={latest ? String(latest.status).replace(/_/g, " ") : "—"} />
    </>);
  } else if (groupKey === "issuance" || groupKey === "annual_review") {
    const a: any[] = records.apps ?? [];
    rows = a.length ? a.map((x) => <Row key={x.id} label={x.product ?? x.provider ?? "Application"} value={String(x.status).replace(/_/g, " ")} />)
      : <Row label="Applications" value="None yet" />;
  }
  if (!rows) return null;

  return (
    <div className="mx-1.5 mb-1 mt-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        <FileText className="h-3 w-3" /> Step output <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />
      </p>
      <ul className="divide-y divide-border/50">{rows}</ul>
    </div>
  );
}
