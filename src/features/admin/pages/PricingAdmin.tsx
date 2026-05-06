import { useState, useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

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
    <section>
      <div className="flex items-baseline justify-between mb-6 border-b border-border pb-4">
        <h3 className="text-xl font-medium tracking-tight text-foreground">{title}</h3>
        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
          {badgeLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Monthly Card */}
        {monthly && (
          <div className="bg-card ring-1 ring-border rounded-3xl p-6 md:p-8 shadow-sm">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Plan Name
            </label>
            <Input
              value={monthly.name}
              onChange={(e) => onChange(monthly.id, "name", e.target.value)}
              className="text-xl font-medium border-0 border-b-2 border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 h-auto py-1 mb-8 bg-transparent"
            />
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Base Rate (Monthly)
            </label>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-3xl text-muted-foreground font-light">$</span>
              <Input
                type="number"
                step="0.01"
                value={monthly.price}
                onChange={(e) => onChange(monthly.id, "price", e.target.value)}
                className="w-full text-4xl md:text-5xl font-medium tabular-nums border-0 border-b-2 border-transparent rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 h-auto bg-transparent"
              />
              <span className="text-base text-muted-foreground font-medium">/mo</span>
            </div>
            <div className="pt-6 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Annual liability</span>
              <span className="text-lg font-medium tabular-nums text-muted-foreground">
                ${formatCurrency(annualLiability)}
              </span>
            </div>
          </div>
        )}

        {/* Annual Card */}
        {annual && (
          <div className="relative bg-card ring-2 ring-primary rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_hsl(var(--primary)/0.08)]">
            <div className="absolute -top-3 right-6 md:right-8 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Best Value
            </div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Plan Name
            </label>
            <Input
              value={annual.name}
              onChange={(e) => onChange(annual.id, "name", e.target.value)}
              className="text-xl font-medium border-0 border-b-2 border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 h-auto py-1 mb-8 bg-transparent"
            />
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Base Rate (Annual)
            </label>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-3xl text-primary font-light">$</span>
              <Input
                type="number"
                step="0.01"
                value={annual.price}
                onChange={(e) => onChange(annual.id, "price", e.target.value)}
                className="w-full text-4xl md:text-5xl font-medium tabular-nums text-primary border-0 border-b-2 border-transparent rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 h-auto bg-transparent"
              />
              <span className="text-base text-muted-foreground font-medium">/yr</span>
            </div>

            {/* Discount Calculator */}
            <div className="pt-6 border-t border-border space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Monthly × 12</span>
                <span className="tabular-nums text-foreground">${formatCurrency(annualLiability)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Annual price</span>
                <span className="tabular-nums text-foreground">−${formatCurrency(annual.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Discount applied</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded ring-1 ring-primary/20 tabular-nums">
                  {discountPct}% OFF
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-medium text-foreground">Total saved</span>
                <span className="text-xl font-medium tabular-nums text-primary">${formatCurrency(savings)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const config of pricing) {
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
      toast({
        title: "Pricing Updated",
        description: "Subscription pricing has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving pricing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 md:mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-2">Subscription Pricing</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-[65ch] font-light">
            Define the financial structure for healthcare providers, patients, and emergency services. Adjust prices to
            see the annual discount calculate in real time.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Publish Changes
        </Button>
      </header>

      <div className="space-y-12 md:space-y-16">
        <RoleSection
          title="Tier 01: Healthcare Providers"
          badgeLabel="Doctor"
          monthly={doctorMonthly}
          annual={doctorAnnual}
          onChange={handleChange}
        />
        <RoleSection
          title="Tier 02: Patient"
          badgeLabel="Patient"
          monthly={patientMonthly}
          annual={patientAnnual}
          onChange={handleChange}
        />
        <RoleSection
          title="Tier 03: Emergency Services"
          badgeLabel="Emergency"
          monthly={emergencyMonthly}
          annual={emergencyAnnual}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
