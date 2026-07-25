import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LegalDocLayoutProps {
  title: string;
  subtitle?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  version?: string;
  owner?: string;
  children: ReactNode;
}

const FUTURE_TO_PRESENT: [RegExp, string][] = [
  [/\byou will be bound\b/gi, "you are bound"],
  [/\byou will be required\b/gi, "you are required"],
  [/\byou will agree\b/gi, "you have agreed"],
  [/\byou will accept\b/gi, "you have accepted"],
  [/\bby signing up,?\s+you agree\b/gi, "You have agreed"],
  [/\bby creating an account,?\s+you agree\b/gi, "You have agreed"],
];

export function LegalDocLayout({
  title,
  subtitle,
  effectiveDate = "1 January 2026",
  lastUpdated,
  version = "1.0",
  owner = "Holarc Health (Pty) Ltd",
  children,
}: LegalDocLayoutProps) {
  const navigate = useNavigate();
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]);
  const [signedSince, setSignedSince] = useState<string | null>(null);
  const updated =
    lastUpdated || new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.created_at) {
        setSignedSince(
          new Date(data.user.created_at).toLocaleDateString("en-ZA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        );
      }
    });
  }, []);

  useEffect(() => {
    // Build TOC from rendered h2 elements and assign ids
    const article = document.querySelector("article.legal-body");
    if (!article) return;

    // Apply present-tense rewrites for signed-in users (text nodes only)
    if (signedSince) {
      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) nodes.push(n as Text);
      for (const node of nodes) {
        let txt = node.nodeValue ?? "";
        for (const [re, rep] of FUTURE_TO_PRESENT) txt = txt.replace(re, rep);
        if (txt !== node.nodeValue) node.nodeValue = txt;
      }
    }

    const headers = Array.from(article.querySelectorAll("h2")) as HTMLHeadingElement[];
    const items = headers.map((h, i) => {
      const id = h.id || `sec-${i + 1}`;
      h.id = id;
      return { id, text: h.textContent || `Section ${i + 1}` };
    });
    setToc(items);
  }, [children, signedSince]);

  return (
    <div className="min-h-screen bg-muted/30">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .legal-card { box-shadow: none !important; border: none !important; }
        }
        article.legal-body { color: hsl(var(--foreground)); }
        article.legal-body h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid hsl(var(--border));
          letter-spacing: -0.01em;
          scroll-margin-top: 5rem;
        }
        article.legal-body h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        article.legal-body p { margin: 0.6rem 0; line-height: 1.7; text-align: justify; }
        article.legal-body ul { margin: 0.5rem 0 0.75rem 1.25rem; list-style: disc; }
        article.legal-body li { margin: 0.25rem 0; line-height: 1.6; }
        article.legal-body a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px; }
        article.legal-body strong { color: hsl(var(--foreground)); font-weight: 600; }
      `}</style>

      {/* Sticky header */}
      <header className="no-print sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-wider text-muted-foreground leading-none">Legal Document</p>
              <h1 className="text-sm md:text-base font-semibold text-foreground truncate">{title}</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <div className="legal-card bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {/* Title block */}
          <div className="border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-6 md:px-10 py-8">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="uppercase tracking-wider text-muted-foreground">Effective</dt>
                <dd className="mt-0.5 font-medium text-foreground">{effectiveDate}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-muted-foreground">Last updated</dt>
                <dd className="mt-0.5 font-medium text-foreground">{updated}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-muted-foreground">Version</dt>
                <dd className="mt-0.5 font-medium text-foreground">{version}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-muted-foreground">Owner</dt>
                <dd className="mt-0.5 font-medium text-foreground">{owner}</dd>
              </div>
            </dl>
          </div>

          <div className="px-6 md:px-10 py-8">
            {signedSince && (
              <div className="mb-6 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="!m-0 text-foreground">
                  By signing up for this application, you have acknowledged and agreed to the following legal
                  agreements: <strong>{signedSince}</strong>.
                </p>
              </div>
            )}
            {/* TOC */}
            {toc.length > 1 && (
              <nav className="no-print mb-8 rounded-md border border-border bg-muted/30 p-4">
                <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  Contents
                </p>
                <ul className="list-none space-y-1 text-sm">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="text-foreground hover:text-primary hover:underline">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <article className="legal-body">{children}</article>

            {/* Signature footer */}
            <div className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">{owner}</p>
              <p>contact@holarchealth.com Â· legal@holarchealth.com</p>
              <p>This document is governed by the laws of the Republic of South Africa.</p>
              <p>
                Â© {new Date().getFullYear()} {owner}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

