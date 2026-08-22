import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";

type MarketingHeaderProps = {
  active?: "home" | "features" | "pricing";
};

export function MarketingHeader({ active }: MarketingHeaderProps) {
  const [open, setOpen] = useState(false);
  const { session, mfaPending } = useAuth();
  const signedIn = Boolean(session) && !mfaPending;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current =
    active ?? (pathname === "/pricing" ? "pricing" : pathname === "/" ? "home" : undefined);

  return (
    <nav className="bg-surface text-primary sticky w-full top-0 border-b border-outline-variant z-50 relative flex justify-between items-center gap-3 px-container-margin-mobile md:px-container-margin-desktop min-h-16 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]">
      <Link
        to="/"
        className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight truncate min-w-0"
      >
        SnapCut AI
      </Link>

      <div className="hidden md:flex items-center gap-8 font-body-md text-body-md">
        <Link
          to="/"
          className={cn(
            "transition-colors",
            current === "home"
              ? "text-secondary font-bold border-b-2 border-secondary"
              : "text-on-surface-variant hover:text-secondary",
          )}
        >
          Home
        </Link>
        <a
          href="/#features"
          className={cn(
            "transition-colors",
            current === "features"
              ? "text-secondary font-bold border-b-2 border-secondary"
              : "text-on-surface-variant hover:text-secondary",
          )}
        >
          Features
        </a>
        <Link
          to="/pricing"
          className={cn(
            "transition-colors",
            current === "pricing"
              ? "text-secondary font-bold border-b-2 border-secondary pb-1"
              : "text-on-surface-variant hover:text-secondary",
          )}
        >
          Pricing
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-4">
        {signedIn ? (
          <Link
            to="/dashboard"
            viewTransition
            className="bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant px-4 py-2 rounded-lg font-label-md text-label-md btn-glow"
          >
            Open Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              viewTransition
              className="font-label-md text-label-md text-on-surface-variant hover:text-secondary"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              viewTransition
              className="bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant px-4 py-2 rounded-lg font-label-md text-label-md btn-glow"
            >
              Get Started
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className="md:hidden flex items-center justify-center text-on-surface-variant p-2"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "close" : "menu"} />
      </button>

      {open ? (
        <div className="absolute top-full inset-x-0 bg-surface-container-lowest border-b border-outline-variant md:hidden p-4 flex flex-col gap-2 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-on-surface"
          >
            Home
          </Link>
          <a
            href="/#features"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-on-surface"
          >
            Features
          </a>
          <Link
            to="/pricing"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-on-surface"
          >
            Pricing
          </Link>
          {signedIn ? (
            <Link
              to="/dashboard"
              viewTransition
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-center"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                viewTransition
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-on-surface"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                viewTransition
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-center"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      ) : null}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant py-12 px-container-margin-mobile md:px-container-margin-desktop mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
          SnapCut AI
        </span>
        <div className="flex gap-6 text-on-surface-variant">
          <a className="hover:text-primary" href="mailto:hello@snapcut.ai?subject=Privacy">
            Privacy
          </a>
          <a className="hover:text-primary" href="mailto:hello@snapcut.ai?subject=Terms">
            Terms
          </a>
          <a className="hover:text-primary" href="mailto:hello@snapcut.ai">
            Contact
          </a>
        </div>
        <p className="text-on-surface-variant text-sm">© 2026 SnapCut AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
