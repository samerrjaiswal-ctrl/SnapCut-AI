import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-lowest">
      <div className="container-page flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <span className="text-lg font-bold text-primary">AegisGuard</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="#privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </a>
          <a href="#terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </a>
          <a href="#contact" className="transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} AegisGuard Security. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
