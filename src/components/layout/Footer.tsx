import { Link } from "react-router-dom";

export function Footer() {
  // Uses --sidebar-width CSS variable via parent ml offset
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Holarc Health. All rights reserved.
          </p>
          <Link
            to="/terms-and-conditions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms & Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
