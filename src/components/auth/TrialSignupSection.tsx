import { ExternalLink, CreditCard, AlertCircle, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";

interface TrialSignupSectionProps {
  userRole: "doctor" | "patient";
  acceptedTerms: boolean;
  onAcceptedTermsChange: (accepted: boolean) => void;
}

export function TrialSignupSection({
  userRole,
  acceptedTerms,
  onAcceptedTermsChange,
}: TrialSignupSectionProps) {
  const monthlyPrice = userRole === "doctor" ? "$49.99" : "$9.99";
  const annualPrice = userRole === "doctor" ? "$499.99" : "$99.99";

  // Determine which consent documents to show based on role
  const primaryConsentDocument = userRole === "patient" 
    ? { name: "Patient Consent and Authorization", path: "/patient-consent" }
    : { name: "Business Associate Agreement", path: "/business-associate-agreement" };

  return (
    <div className="pt-4 border-t border-border space-y-4">
      {/* Free Trial Info */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-primary" />
          7-Day Free Trial
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Start your free trial today. After 7 days, your subscription will automatically begin at{" "}
          <span className="font-semibold text-foreground">{monthlyPrice}/month</span>.
        </p>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground">Full access to all features during trial</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground">PayPal payment details required to start</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground">Cancel anytime before trial ends to avoid charges</span>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs">
          <strong>Important:</strong> You will be required to add your PayPal payment details after registration.
          Your card will <strong>not</strong> be charged during the 7-day trial. Monthly billing ({monthlyPrice}/month) 
          begins automatically after the trial unless you cancel. It is your responsibility to cancel before the trial ends 
          if you do not wish to continue.
        </AlertDescription>
      </Alert>

      {/* Pricing Info */}
      <div className="rounded-lg border border-border p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">After your free trial:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-background border border-border">
            <p className="font-medium text-foreground">Monthly</p>
            <p className="text-primary font-semibold">{monthlyPrice}/mo</p>
          </div>
          <div className="p-2 rounded bg-background border border-border">
            <p className="font-medium text-foreground">Annual</p>
            <p className="text-primary font-semibold">{annualPrice}/yr</p>
            <p className="text-[10px] text-muted-foreground">Save 17%</p>
          </div>
        </div>
      </div>

      {/* Terms/Consent Agreement */}
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="acceptTerms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => onAcceptedTermsChange(checked as boolean)}
            className="mt-0.5"
          />
          <Label htmlFor="acceptTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            I have read and agree to the{" "}
            <Link 
              to={primaryConsentDocument.path}
              target="_blank"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {primaryConsentDocument.name}
              <ExternalLink className="h-3 w-3" />
            </Link>
            {" "}and the{" "}
            <Link 
              to="/terms-and-conditions"
              target="_blank"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Terms and Conditions
              <ExternalLink className="h-3 w-3" />
            </Link>
            . I understand that my subscription will automatically renew at {monthlyPrice}/month after the 7-day free trial 
            unless I cancel before the trial period ends. I accept full responsibility for cancelling if I do not wish to continue.
          </Label>
        </div>
      </div>
    </div>
  );
}