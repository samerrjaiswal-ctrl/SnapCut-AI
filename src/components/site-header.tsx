import { Link } from "@tanstack/react-router";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/security", label: "Security" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-page flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="size-7 text-primary" />
          <span className="text-2xl font-bold text-primary">AegisGuard</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            to="/verify"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-accent px-6 py-2 font-medium text-accent-foreground transition hover:opacity-85"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="text-foreground md:hidden"
        >
          {open ? <X className="size-7" /> : <Menu className="size-7" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="container-page flex flex-col gap-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link to="/register" onClick={() => setOpen(false)} className="text-primary font-semibold">
              Get Started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
