import { useState, useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage } from "@/pages/admin/_shared/AdminPage";
import { AdminPanel } from "@/pages/admin/_shared/AdminPanel";
import { useAutosave } from "@/features/admin/hooks/useAutosave";
import { AutosaveIndicator } from "@/features/admin/components/AutosaveIndicator";

interface PricingConfig {
  id: string;
  role: string;
  billing_cycle: string;
  price: number;
  name: string;
  savings: number;
}

const calculateSavings = <T extends PricingConfig>(pricing: T[], role: string): T[] => {
  const monthly = pricing.find((p) => p.role === role && p.billing_cycle === "monthly");
  const annual = pricing.find((p) => p.role === role && p.billing_cycle === "annual");
  if (!monthly || !annual) return pricing;
  const calculatedSavings = parseFloat((monthly.price * 12 - annual.price).toFixed(2));
  return pricing.map((p) => (p.id === annual.id ? { ...p, savings: calculatedSavings } : p));
};

const formatCurrency = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface RoleSectionProps {
  title: string;
  badgeLabel: string;
  monthly?: PricingConfig;
  annual?: PricingConfig;
  onChange: (id: string, field: keyof PricingConfig, value: string) => void;
}

function RoleSection({ title, badgeLabel, monthly, annual, onChange }: RoleSectionProps) {
  const annualLiability = monthly ? monthly.price * 12 : 0;
  const savings = annual?.savings ?? 0;
  const discountPct = annualLiability > 0 ? ((savings / annualLiability) * 100).toFixed(1) : "0.0";

  return (
    <AdminPanel
      title={title}
      description={`${badgeLabel} subscription tier`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Monthly */}
        {monthly && (
          <div className="rounded-md border border-[hsl(var(--admin-border-subtle))] bg-[hsl(var(--admin-surface-muted))] p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--admin-text-tertiary))] mb-2">
              Monthly plan
            </p>
            <Input
              value={monthly.name}
              onChange={(e) => onChange(monthly.id, "name", e.target.value)}
              className="text-sm font-semibold border-0 border-b border-[hsl(var(--admin-border-strong))] rounded-none focus-visible:ring-0 focus-visible:border-[hsl(var(--admin-accent))] px-0 h-auto py-1 mb-4 bg-transparent"
            />
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[18px] text-[hsl(var(--admin-text-tertiary))]">$</span>
              <Input
                type="number"
                step="0.01"
                value={monthly.price}
                onChange={(e) => onChange(monthly.id, "price", e.target.value)}
                className="w-full text-[28px] font-semibold tabular-nums border-0 border-b border-transparent rounded-none focus-visible:ring-0 focus-visible:border-[hsl(var(--admin-accent))] px-0 h-auto bg-transparent"
              />
              <span className="text-sm text-[hsl(var(--admin-text-tertiary))]">/mo</span>
            </div>
            <div className="flex justify-between border-t border-[hsl(var(--admin-border-subtle))] pt-2 text-sm">
              <span className="text-[hsl(var(--admin-text-tertiary))]">Annual liability</span>
              <span className="tabular-nums text-[hsl(var(--admin-text-secondary))]">${formatCurrency(annualLiability)}</span>
            </div>
          </div>
        )}

        {/* Annual */}
        {annual && (
          <div className="rounded-md border border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-surface))] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--admin-accent))]">
                Annual plan
              </p>
              <span className="text-xs font-semibold text-[hsl(var(--admin-accent))] uppercase tracking-wider">
                Best value
              </span>
            </div>
            <Input
              value={annual.name}
              onChange={(e) => onChange(annual.id, "name", e.target.value)}
              className="text-sm font-semibold border-0 border-b border-[hsl(var(--admin-border-strong))] rounded-none focus-visible:ring-0 focus-visible:border-[hsl(var(--admin-accent))] px-0 h-auto py-1 mb-4 bg-transparent"
            />
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[18px] text-[hsl(var(--admin-accent))]">$</span>
              <Input
                type="number"
                step="0.01"
                value={annual.price}
                onChange={(e) => onChange(annual.id, "price", e.target.value)}
                className="w-full text-[28px] font-semibold tabular-nums text-[hsl(var(--admin-accent))] border-0 border-b border-transparent rounded-none focus-visible:ring-0 focus-visible:border-[hsl(var(--admin-accent))] px-0 h-auto bg-transparent"
              />
              <span className="text-sm text-[hsl(var(--admin-text-tertiary))]">/yr</span>
            </div>
            <div className="space-y-1.5 border-t border-[hsl(var(--admin-border-subtle))] pt-2 text-sm">
              <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-tertiary))]">Monthly × 12</span><span className="tabular-nums">${formatCurrency(annualLiability)}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-tertiary))]">Annual price</span><span className="tabular-nums">−${formatCurrency(annual.price)}</span></div>
              <div className="flex justify-between"><span className="text-[hsl(var(--admin-text-tertiary))]">Discount</span><span className="font-semibold text-[hsl(var(--admin-accent))] tabular-nums">{discountPct}%</span></div>
              <div className="flex justify-between border-t border-[hsl(var(--admin-border-subtle))] pt-1.5"><span className="font-medium">Total saved</span><span className="font-semibold tabular-nums text-[hsl(var(--admin-accent))]">${formatCurrency(savings)}</span></div>
            </div>
          </div>
        )}
      </div>
    </AdminPanel>
  );
}

export default function PricingAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isDoctor, loading: roleLoading } = useUserRole();
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("pricing_config").select("*").order("role").order("billing_cycle");

      if (error) throw error;
      let result = (data || []) as PricingConfig[];
      result = calculateSavings(result, "doctor");
      result = calculateSavings(result, "patient");
      result = calculateSavings(result, "emergency");
      setPricing(result);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: keyof PricingConfig, value: string) => {
    setPricing((prev) => {
      const updated = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: field === "price" || field === "savings" ? parseFloat(value) || 0 : value,
            }
          : p,
      );
      if (field === "price") {
        const changed = prev.find((p) => p.id === id);
        if (changed) return calculateSavings(updated, changed.role);
      }
      return updated;
    });
  };

  const { status: autosaveStatus, error: autosaveError } = useAutosave(
    pricing,
    async (snapshot) => {
      if (!user || snapshot.length === 0) return;
      for (const config of snapshot) {
        const { error } = await supabase
          .from("pricing_config")
          .update({
            price: config.price,
            name: config.name,
            savings: config.savings,
          })
          .eq("id", config.id);
        if (error) throw error;
      }
    },
    { delay: 700, enabled: !loading },
  );


  if (roleLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isDoctor) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const doctorMonthly = pricing.find((p) => p.role === "doctor" && p.billing_cycle === "monthly");
  const doctorAnnual = pricing.find((p) => p.role === "doctor" && p.billing_cycle === "annual");
  const patientMonthly = pricing.find((p) => p.role === "patient" && p.billing_cycle === "monthly");
  const patientAnnual = pricing.find((p) => p.role === "patient" && p.billing_cycle === "annual");
  const emergencyMonthly = pricing.find((p) => p.role === "emergency" && p.billing_cycle === "monthly");
  const emergencyAnnual = pricing.find((p) => p.role === "emergency" && p.billing_cycle === "annual");

  return (
    <AdminPage
      eyebrow="Admin"
      title="Subscription Pricing"
      description="Define monthly and annual rates for providers, patients, and emergency services."
      actions={<AutosaveIndicator status={autosaveStatus} error={autosaveError} />}
    >
      <div className="space-y-3">
        <RoleSection title="Tier 01 — Healthcare Providers" badgeLabel="Doctor"     monthly={doctorMonthly}    annual={doctorAnnual}    onChange={handleChange} />
        <RoleSection title="Tier 02 — Patient"              badgeLabel="Patient"    monthly={patientMonthly}   annual={patientAnnual}   onChange={handleChange} />
        <RoleSection title="Tier 03 — Emergency Services"   badgeLabel="Emergency"  monthly={emergencyMonthly} annual={emergencyAnnual} onChange={handleChange} />
      </div>
    </AdminPage>
  );
}
