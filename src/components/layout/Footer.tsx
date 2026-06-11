import { Link } from "react-router-dom";
import { LifeBuoy } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { to: "/terms-and-conditions", label: "Terms and Conditions" },
    { to: "/patient-consent", label: "Privacy & Consent" },
    { to: "/business-associate-agreement", label: "Compliance" },
    { to: "/legal", label: "Legal Center" },
  ];

  const Dot = () => <span aria-hidden="true" className="opacity-50">·</span>;

  return (
    <footer className="border-t border-border bg-card/50 h-[var(--footer-height)] flex items-center">
      <div className="md:ml-[var(--sidebar-width)] w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>© {currentYear} Holarc Health (Pty) Ltd. All rights reserved.</span>
          {links.map((l) => (
            <span key={l.to} className="flex items-center gap-3">
              <Dot />
              <Link to={l.to} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-3">
            <Dot />
            <a
              href="mailto:support@holarchealth.com?subject=Holarc%20Health%20Support"
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Contact Support
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
