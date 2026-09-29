import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientWealth, num, zar } from "@/features/wealth-workflow/client/useClientWealth";

const RETIREMENT = ["Retirement annuity", "Pension fund", "Provident fund", "Preservation fund"];
const CLAIM_TYPES = ["Death", "Disability", "Income protection", "Severe illness", "Short-term (vehicle / home)", "Funeral", "Other"];
const DOC_LABEL: Record<string, string> = {
  roa_signed: "Record of Advice (signed)",
  mandate_signed: "Mandate (signed)",
  policy_schedule: "Policy schedule",
};

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-primary bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{text}</p>;
}

function Row({ cells }: { cells: React.ReactNode[] }) {
  return (
    <li className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs">
      {cells.map((c, i) => <div key={i} className="min-w-0 truncate">{c}</div>)}
    </li>
  );
}

export default function MyFuture() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useClientWealth();
  const [claimType, setClaimType] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [claimFile, setClaimFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!data?.patientId) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-bold text-foreground">My Future</h1>
        <Empty text="Your client record isn't linked to this account yet. Ask your Wealth Manager to send you an invitation." />
      </div>
    );
  }

  const risk = data.policies;
  const investments = data.holdings.filter((h) => !RETIREMENT.includes(h.kind));
  const retirement = data.holdings.filter((h) => RETIREMENT.includes(h.kind));

  const submitClaim = async () => {
    if (!claimType) return toast.error("Choose the type of claim before submitting.");
    if (claimFile && claimFile.size > 5 * 1024 * 1024) return toast.error("That file is larger than 5MB. Please attach a smaller file.");
    setSaving(true);
    try {
      let attachment_path: string | null = null;
      if (claimFile) {
        const path = `${data.patientId}/claims/${Date.now()}-${claimFile.name}`;
        const { error } = await supabase.storage.from("compliance-docs").upload(path, claimFile);
        if (error) throw error;
        attachment_path = path;
      }
      const { error } = await (supabase as any).from("wealth_claims").insert({
        patient_id: data.patientId, claim_type: claimType, description: claimDesc || null, attachment_path, created_by: user?.id,
      });
      if (error) throw error;
      toast.success("Claim logged. Your Wealth Manager has been notified and will be in touch.");
      setClaimType(""); setClaimDesc(""); setClaimFile(null);
      qc.invalidateQueries({ queryKey: ["client-wealth"] });
    } catch (e: any) {
      toast.error(`We couldn't log your claim: ${e.message || "please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Future</h1>
        <p className="text-sm text-muted-foreground">Your cover, investments, retirement, claims and documents in one place.</p>
      </div>

      <Tabs defaultValue="cover">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cover">My Cover</TabsTrigger>
          <TabsTrigger value="investments">My Investments</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="cover" className="space-y-4">
          <Frame title="Policies issued through your adviser">
            {data.issued.length ? (
              <ul className="space-y-2">
                {data.issued.map((a) => (
                  <Row key={a.id} cells={[
                    <span className="font-semibold">{a.product}</span>, a.provider,
                    a.monthly_premium ? `${zar(num(a.monthly_premium))} /month` : "Premium not captured",
                    a.review_date ? `Review ${format(new Date(a.review_date), "d MMM yyyy")}` : "",
                  ]} />
                ))}
              </ul>
            ) : <Empty text="No policies have been issued through your adviser yet." />}
          </Frame>
          <Frame title="Your existing cover">
            {risk.length ? (
              <ul className="space-y-2">
                {risk.map((p, i) => (
                  <Row key={i} cells={[<span className="font-semibold">{p.kind}</span>, p.insurer || "—", p.cover ? zar(num(p.cover)) : "—", p.premium ? `${zar(num(p.premium))} /month` : "—"]} />
                ))}
              </ul>
            ) : <Empty text="No existing cover captured yet. Your Wealth Manager will add it during your needs analysis." />}
          </Frame>
        </TabsContent>

        <TabsContent value="investments">
          <Frame title="My Investments">
            {investments.length ? (
              <ul className="space-y-2">
                {investments.map((h, i) => (
                  <Row key={i} cells={[<span className="font-semibold">{h.kind}</span>, h.provider || "—", h.value ? zar(num(h.value)) : "—", h.contribution ? `${zar(num(h.contribution))} /month` : "—"]} />
                ))}
              </ul>
            ) : <Empty text="No investments captured yet. Share your statements with your Wealth Manager to see them here." />}
          </Frame>
        </TabsContent>

        <TabsContent value="retirement" className="space-y-4">
          <Frame title="Retirement savings">
            {retirement.length ? (
              <ul className="space-y-2">
                {retirement.map((h, i) => (
                  <Row key={i} cells={[<span className="font-semibold">{h.kind}</span>, h.provider || "—", h.value ? zar(num(h.value)) : "—", h.contribution ? `${zar(num(h.contribution))} /month` : "—"]} />
                ))}
              </ul>
            ) : <Empty text="No retirement funds captured yet." />}
          </Frame>
          <Frame title="Your retirement goal">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><p className="text-muted-foreground">Target retirement age</p><p className="text-lg font-semibold">{data.goals.retirementAge ?? "Not set"}</p></div>
              <div><p className="text-muted-foreground">Desired income</p><p className="text-lg font-semibold">{data.goals.retirementIncome ? `${zar(data.goals.retirementIncome)} /month` : "Not set"}</p></div>
              <div><p className="text-muted-foreground">Saved so far</p><p className="text-lg font-semibold">{zar(data.totals.retirement)}</p></div>
            </div>
          </Frame>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Frame title="Log a claim">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type of claim</Label>
                <Select value={claimType} onValueChange={setClaimType}>
                  <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
                  <SelectContent>{CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supporting document (optional, max 5MB)</Label>
                <Input type="file" onChange={(e) => setClaimFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>What happened?</Label>
                <Textarea value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)} placeholder="Briefly describe the event and the date it happened." />
              </div>
            </div>
            <Button className="mt-3 gap-1.5" onClick={submitClaim} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Submit claim
            </Button>
          </Frame>
          <Frame title="Your claims">
            {data.claims.length ? (
              <ul className="space-y-2">
                {data.claims.map((c) => (
                  <Row key={c.id} cells={[<span className="font-semibold">{c.claim_type}</span>, format(new Date(c.created_at), "d MMM yyyy"), <span className="capitalize">{c.status}</span>, c.description || ""]} />
                ))}
              </ul>
            ) : <Empty text="You haven't logged any claims." />}
          </Frame>
        </TabsContent>

        <TabsContent value="documents">
          <Frame title="Documents">
            {data.documents.length ? (
              <ul className="space-y-2">
                {data.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3 text-xs">
                    <span className="font-semibold truncate">{DOC_LABEL[d.document_kind] ?? d.name}</span>
                    <span className="text-muted-foreground shrink-0">{format(new Date(d.created_at), "d MMM yyyy")}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty text="No documents yet. Signed documents will appear here." />}
            <Link to="/patient/details?section=admin" className="mt-3 inline-block text-xs font-semibold text-primary">Open all documents →</Link>
          </Frame>
        </TabsContent>
      </Tabs>
    </div>
  );
}
