import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { to: "/terms-and-conditions", label: "Terms & Conditions" },
    { to: "/patient-consent", label: "HIPAA Patient Consent & Authorization" },
    { to: "/business-associate-agreement", label: "HIPAA Business Associate Agreement" },
    { to: "/legal", label: "All Legal Terms" },
  ];

  return (
    <footer className="border-t border-border bg-card/50 py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-3">
        <p className="text-center text-xs text-muted-foreground">
          © {currentYear} Holarc Health (Pty) Ltd. All rights reserved.
        </p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          {links.map((l, i) => (
            <span key={l.to} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className="opacity-50">·</span>}
              <Link to={l.to} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
