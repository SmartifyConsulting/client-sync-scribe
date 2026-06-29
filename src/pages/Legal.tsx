import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LegalDocLayout } from "@/components/legal/LegalDocLayout";
import { FileText, ChevronRight } from "lucide-react";

export default function Legal() {
  const { t } = useTranslation();

  const docs = [
    { to: "/terms-and-conditions", title: t('legal.documents.termsTitle'), description: t('legal.documents.termsDescription') },
    { to: "/business-associate-agreement", title: t('legal.documents.providerTitle'), description: t('legal.documents.providerDescription') },
    { to: "/patient-consent", title: t('legal.documents.consentTitle'), description: t('legal.documents.consentDescription') },
  ];

  return (
    <LegalDocLayout title={t('legal.title')} subtitle={t('legal.subtitle')}>
      <>
        <p>
          {t('legal.introduction')}
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
