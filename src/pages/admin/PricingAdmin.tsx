import { useState, useEffect } from "react";
import { DollarSign, Loader2, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingConfig {
  id: string;
  role: string;
  billing_cycle: string;
  price: number;
  name: string;
  savings: number;
}

// Auto-calculate annual savings: (monthly * 12) - annual
const calculateSavings = <T extends PricingConfig>(pricing: T[], role: string): T[] => {
  const monthly = pricing.find(p => p.role === role && p.billing_cycle === 'monthly');
  const annual = pricing.find(p => p.role === role && p.billing_cycle === 'annual');
  if (!monthly || !annual) return pricing;
  const calculatedSavings = parseFloat(((monthly.price * 12) - annual.price).toFixed(2));
  return pricing.map(p =>
    p.id === annual.id ? { ...p, savings: calculatedSavings } : p
  );
};

export default function PricingAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('role')
        .order('billing_cycle');

      let result = data || [];
      result = calculateSavings(result, 'doctor');
      result = calculateSavings(result, 'patient');
      setPricing(result);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: string, field: keyof PricingConfig, value: string | number) => {
    setPricing(prev => {
      const updated = prev.map(p => 
        p.id === id ? { ...p, [field]: field === 'price' || field === 'savings' ? parseFloat(value as string) || 0 : value } : p
      );
      // Recalculate savings for the role when price changes
      if (field === 'price') {
        const changedItem = prev.find(p => p.id === id);
        if (changedItem) {
          return calculateSavings(updated, changedItem.role);
        }
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
          .from('pricing_config')
          .update({
            price: config.price,
            name: config.name,
            savings: config.savings,
          })
          .eq('id', config.id);

        if (error) throw error;
      }

      toast({
        title: "Pricing Updated",
        description: "Subscription pricing has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving pricing:', error);
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const doctorPricing = pricing.filter(p => p.role === 'doctor');
  const patientPricing = pricing.filter(p => p.role === 'patient');

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Administration</h1>
          <p className="mt-1 text-muted-foreground text-[12px]">
            Manage subscription pricing for doctors and patients
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Doctor Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Doctor Plans
          </CardTitle>
          <CardDescription>Configure pricing for doctor subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {doctorPricing.map((config) => (
            <div key={config.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={config.name}
                  onChange={(e) => handlePriceChange(config.id, 'name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Input value={config.billing_cycle} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  value={config.price}
                  onChange={(e) => handlePriceChange(config.id, 'price', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Savings ($)</Label>
                <Input
                  value={config.billing_cycle === 'annual' ? config.savings : 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patient Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Patient Plans
          </CardTitle>
          <CardDescription>Configure pricing for patient subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {patientPricing.map((config) => (
            <div key={config.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={config.name}
                  onChange={(e) => handlePriceChange(config.id, 'name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Input value={config.billing_cycle} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  value={config.price}
                  onChange={(e) => handlePriceChange(config.id, 'price', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Savings ($)</Label>
                <Input
                  value={config.billing_cycle === 'annual' ? config.savings : 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
