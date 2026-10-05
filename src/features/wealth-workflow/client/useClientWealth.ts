import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as any;
export const num = (v: any) => Number(v) || 0;
export const zar = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;
export const zarShort = (n: number) =>
  n >= 1_000_000 ? `R${(n / 1_000_000).toFixed(1)}m` : n >= 1_000 ? `R${Math.round(n / 1_000)}k` : zar(n);

const LIAB = ["Home loan (bond)", "Vehicle finance", "Credit card", "Personal loan", "Other debt"];
const RETIREMENT = ["Retirement annuity", "Pension fund", "Provident fund", "Preservation fund"];

export interface ClientWealth {
  patientId: string | null;
  clientName: string;
  profile: Record<string, any>;
  policies: any[];
  holdings: any[];
  issued: any[];
  workflow: any | null;
  stageLabel: string | null;
  todos: any[];
  documents: any[];
  claims: any[];
  beneficiaries: { name: string; relationship?: string; share?: number }[];
  totals: {
    lifeCover: number;
    incomeProtection: number;
    severeIllness: number;
    disability: number;
    monthlyPremiums: number;
    monthlyExpenses: number;
    investments: number;
    retirement: number;
    taxFree: number;
    assets: number;
    liabilities: number;
    netWorth: number;
  };
  goals: { retirementAge?: number; retirementIncome?: number; riskProfile?: string; goals?: string };
}

/** Everything a client's own wealth views need, read from the real client record. */
export function useClientWealth(explicitPatientId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-wealth", explicitPatientId ?? user?.id],
    enabled: !!(explicitPatientId || user?.id),
    queryFn: async (): Promise<ClientWealth> => {
      let patient: any = null;
      if (explicitPatientId) {
        patient = (await sb.from("patients").select("id,name,next_of_kin_members,next_of_kin_name,next_of_kin_relationship").eq("id", explicitPatientId).maybeSingle()).data;
      } else {
        patient = (await sb.from("patients").select("id,name,next_of_kin_members,next_of_kin_name,next_of_kin_relationship").eq("patient_user_id", user!.id).order("created_at").limit(1).maybeSingle()).data;
      }
      const pid = patient?.id ?? null;
      if (!pid) {
        return emptyWealth();
      }
      const [fp, wf, docs, claims, todos, defs] = await Promise.all([
        sb.from("client_financial_profiles").select("*").eq("patient_id", pid).maybeSingle(),
        sb.from("wealth_workflows").select("*").eq("patient_id", pid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        sb.from("documents").select("id,name,document_kind,created_at").eq("patient_id", pid).eq("is_draft", false).order("created_at", { ascending: false }).limit(20),
        sb.from("wealth_claims").select("*").eq("patient_id", pid).order("created_at", { ascending: false }),
        sb.from("todos").select("id,title,due_date,status,owner_role,stage").eq("patient_id", pid).neq("status", "completed").order("due_date", { ascending: true }).limit(20),
        sb.from("wealth_workflow_stage_defs").select("stage,label"),
      ]);
      const issuedRes = await sb
        .from("wealth_applications")
        .select("id,product,provider,monthly_premium,status,issued_at,review_date,wealth_workflows!inner(patient_id)")
        .eq("wealth_workflows.patient_id", pid)
        .eq("status", "issued");

      const profile = fp.data ?? {};
      const policies: any[] = profile.risk_portfolio?.policies ?? [];
      const holdings: any[] = profile.investments?.holdings ?? [];
      const items: any[] = profile.assets_liabilities?.items ?? [];
      const issued: any[] = issuedRes.data ?? [];
      const sumKind = (k: string) => policies.filter((p) => p.kind === k).reduce((s, p) => s + num(p.cover), 0);
      const liabilities = items.filter((i) => LIAB.includes(i.kind)).reduce((s, i) => s + num(i.value), 0);
      const investmentsAll = holdings.reduce((s, h) => s + num(h.value), 0);
      const assets = items.filter((i) => !LIAB.includes(i.kind)).reduce((s, i) => s + num(i.value), 0) + investmentsAll;

      const nok: any[] = Array.isArray(patient.next_of_kin_members) ? patient.next_of_kin_members : [];
      const beneficiaries = nok.length
        ? nok.map((n: any) => ({ name: n.name || n.full_name || "Unnamed", relationship: n.relationship, share: n.share ?? n.percentage }))
        : patient.next_of_kin_name
          ? [{ name: patient.next_of_kin_name, relationship: patient.next_of_kin_relationship }]
          : [];

      const stageLabel = wf.data ? (defs.data ?? []).find((d: any) => d.stage === wf.data.current_stage)?.label ?? wf.data.current_stage : null;

      return {
        patientId: pid,
        clientName: patient.name ?? "",
        profile,
        policies,
        holdings,
        issued,
        workflow: wf.data ?? null,
        stageLabel,
        todos: (todos.data ?? []).filter((t: any) => !t.owner_role || t.owner_role === "client"),
        documents: docs.data ?? [],
        claims: claims.data ?? [],
        beneficiaries,
        totals: {
          lifeCover: sumKind("Life cover"),
          incomeProtection: sumKind("Income protection"),
          severeIllness: sumKind("Severe illness"),
          disability: sumKind("Disability"),
          monthlyPremiums:
            policies.reduce((s, p) => s + num(p.premium), 0) + issued.reduce((s, a) => s + num(a.monthly_premium), 0),
          monthlyExpenses: num(profile.cash_flow?.fixed_expenses) + num(profile.cash_flow?.discretionary_expenses),
          investments: holdings.filter((h) => !RETIREMENT.includes(h.kind)).reduce((s, h) => s + num(h.value), 0),
          retirement: holdings.filter((h) => RETIREMENT.includes(h.kind)).reduce((s, h) => s + num(h.value), 0),
          taxFree: holdings.filter((h) => h.kind === "Tax-free savings").reduce((s, h) => s + num(h.value), 0),
          assets,
          liabilities,
          netWorth: assets - liabilities,
        },
        goals: {
          retirementAge: num(profile.goals_risk?.retirement_age) || undefined,
          retirementIncome: num(profile.goals_risk?.retirement_income) || undefined,
          riskProfile: profile.goals_risk?.risk_profile,
          goals: profile.goals_risk?.goals,
        },
      };
    },
  });
}

function emptyWealth(): ClientWealth {
  return {
    patientId: null, clientName: "", profile: {}, policies: [], holdings: [], issued: [], workflow: null, stageLabel: null,
    todos: [], documents: [], claims: [], beneficiaries: [],
    totals: { lifeCover: 0, incomeProtection: 0, severeIllness: 0, disability: 0, monthlyPremiums: 0, monthlyExpenses: 0, investments: 0, retirement: 0, taxFree: 0, assets: 0, liabilities: 0, netWorth: 0 },
    goals: {},
  };
}
