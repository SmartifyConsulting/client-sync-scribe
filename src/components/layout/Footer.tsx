import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} mIRI360. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link
              to="/terms-and-conditions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/patient-consent"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Patient Consent
            </Link>
            <Link
              to="/business-associate-agreement"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              BAA (HIPAA)
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
