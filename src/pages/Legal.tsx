import { Link } from "react-router-dom";
import { LegalDocLayout } from "@/components/legal/LegalDocLayout";
import { FileText, ChevronRight } from "lucide-react";

const docs = [
  { to: "/terms-and-conditions", title: "Terms and Conditions", description: "Master agreement governing your use of the Holarc platform, including intellectual property and anti-cloning terms." },
  { to: "/business-associate-agreement", title: "Healthcare Provider Agreement", description: "HIPAA Business Associate Agreement and provider-specific obligations." },
  { to: "/patient-consent", title: "Patient Consent and Authorization", description: "How your health information is collected, used and shared on the platform." },
];

export default function Legal() {
  return (
    <LegalDocLayout title="Legal Terms" subtitle="The agreements that govern your use of Holarc Health.">
      <>
        <p>
          The following agreements set out your rights and obligations on the platform. Each opens in a focused reading view.
        </p>
        <ul className="list-none p-0 m-0 flex flex-col gap-5 [&>li]:before:hidden">
          {docs.map((d) => (
            <li key={d.to} className="!m-0 list-none">
              <Link
                to={d.to}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm hover:shadow-md hover:border-primary hover:bg-accent transition-all no-underline"
              >
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground !m-0">{d.title}</p>
                  <p className="text-sm text-muted-foreground !m-0">{d.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </>
    </LegalDocLayout>
  );
}
