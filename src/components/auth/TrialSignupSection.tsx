import { ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const primaryConsentDocument = userRole === "patient"
    ? { name: "Patient Consent and Authorization", path: "/patient-consent" }
    : { name: "Business Associate Agreement", path: "/business-associate-agreement" };

  return (
    <div className="pt-4 border-t border-border space-y-4">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="acceptTerms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => onAcceptedTermsChange(checked as boolean)}
          className="mt-0.5"
        />
        <Label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
          I have read and agree to the{" "}
          <Link
            to={primaryConsentDocument.path}
            target="_blank"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {primaryConsentDocument.name}
            <ExternalLink className="h-4 w-4" />
          </Link>
          {" "}and the{" "}
          <Link
            to="/terms-and-conditions"
            target="_blank"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Terms and Conditions
            <ExternalLink className="h-4 w-4" />
          </Link>
          .
        </Label>
      </div>
    </div>
  );
}

