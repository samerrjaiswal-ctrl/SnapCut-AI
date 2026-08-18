import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, QrCode } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { OtpInput } from "@/components/otp-input";

export const Route = createFileRoute("/totp-setup")({
  head: () => ({
    meta: [
      { title: "Set up your authenticator | AegisGuard" },
      {
        name: "description",
        content:
          "Scan the QR code, sync your device secret, and verify your first time-based one-time password with AegisGuard.",
      },
      { property: "og:title", content: "Set up your authenticator | AegisGuard" },
      {
        property: "og:description",
        content: "Link your device in three steps: scan, verify, complete.",
      },
    ],
  }),
  component: TotpSetup,
});

const steps = ["Scan", "Verify", "Complete"];
const SETUP_KEY = "JBSW Y3DP EHPK 3PXP";

function TotpSetup() {
  const [showKey, setShowKey] = useState(false);

  return (
    <AppShell title="Set up Authenticator">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Set up Authenticator</h2>
        <p className="mb-8 text-muted-foreground">
          Enhance your account security with Time-Based One-Time Passwords (TOTP).
        </p>

        <ol className="mb-10 flex items-center gap-4">
          {steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full font-semibold ${
                  i === 0
                    ? "bg-brand-gradient text-brand-foreground"
                    : "glass text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
              {i < steps.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="mb-6 text-muted-foreground">
              Scan this QR code using your authenticator app.
            </p>
            <div className="mx-auto grid size-52 place-items-center rounded-xl border border-border bg-white/90 p-3">
              <QrCode className="size-full text-[#10131a]" strokeWidth={1.25} />
            </div>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="mt-6 text-sm text-cyan hover:underline"
            >
              {showKey ? "Hide setup key" : "Can't scan? Show setup key"}
            </button>
            {showKey ? (
              <p className="mt-3 font-mono text-lg tracking-widest text-foreground">{SETUP_KEY}</p>
            ) : null}
          </div>

          <div className="glass glow-cyan rounded-2xl p-8">
            <p className="mb-6 text-center text-muted-foreground">Enter 6-digit code to verify</p>
            <OtpInput />
            <Link
              to="/recovery-codes"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient py-3 font-semibold text-brand-foreground transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--cyan)]"
            >
              <Lock className="size-5" />
              Verify Code
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
