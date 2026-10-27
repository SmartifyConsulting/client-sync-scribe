import { Link } from "react-router-dom";
import { LegalDocLayout } from "@/components/legal/LegalDocLayout";
import { FileText, ChevronRight } from "lucide-react";

export default function Legal() {
  const docs = [
    { to: "/terms-and-conditions", title: "Terms and Conditions", description: "The terms governing your use of Holarc Wealth" },
    { to: "/wealth-manager-agreement", title: "Wealth Manager Operator Agreement", description: "Data processing terms for Wealth Managers using the Platform" },
    { to: "/client-consent", title: "Client Consent and Privacy Notice", description: "What you are agreeing to as a client of the Platform" },
  ];

  return (
    <LegalDocLayout title="Legal Documents" subtitle="Review the agreements that govern your use of Holarc Wealth">
      <>
        <p>
          Review the legal documents that govern your use of the Holarc Wealth platform.
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
