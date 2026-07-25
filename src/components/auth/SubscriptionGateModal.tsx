import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard } from "lucide-react";

export function SubscriptionGateModal() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Subscription Required
          </h2>
          <p className="text-sm text-muted-foreground">
            Subscribe to continue using all features of the app.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="font-medium text-foreground">Monthly</p>
            <p className="text-primary font-bold text-lg">From $9.99</p>
            <p className="text-muted-foreground">per month</p>
          </div>
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="font-medium text-foreground">Annual</p>
            <p className="text-primary font-bold text-lg">From $99.99</p>
            <p className="text-muted-foreground">per year Â· Save 17%</p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/settings?tab=billing")}
          className="w-full"
          size="lg"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Subscribe Now
        </Button>

        <p className="text-sm text-muted-foreground">
          You can manage your subscription anytime from Settings.
        </p>
      </div>
    </div>
  );
}

