import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Smartphone, Timer } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OtpInput } from "@/components/otp-input";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Authenticator Verification | AegisGuard" },
      {
        name: "description",
        content:
          "Enter the current 6-digit code from your authenticator app to finish signing in to AegisGuard.",
      },
      { property: "og:title", content: "Authenticator Verification | AegisGuard" },
      {
        property: "og:description",
        content: "Verify your identity with a device-generated TOTP code.",
      },
    ],
  }),
  component: Verify,
});

function Verify() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] opacity-40" />
        <div className="glass relative w-full max-w-lg rounded-2xl p-8 text-center">
          <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl border border-border bg-cyan/10">
            <Smartphone className="size-7 text-cyan" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Authenticator Verification</h1>
          <p className="mb-8 text-muted-foreground">
            Open your authenticator app and enter the current 6-digit code.
          </p>

          <OtpInput />

          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="size-4 text-cyan" />
            Code refreshes in 30 seconds
          </p>

          <button
            type="button"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient py-3 font-semibold text-brand-foreground transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--cyan)] glow-hover"
          >
            <Lock className="size-5" />
            Verify
          </button>

          <Link
            to="/recovery-codes"
            className="mt-4 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Use another method
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
