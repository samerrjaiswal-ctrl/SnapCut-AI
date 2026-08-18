import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  KeyRound,
  LockOpen,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How AegisGuard TOTP Works | AegisGuard" },
      {
        name: "description",
        content:
          "From registration to access: see how AegisGuard links your device, generates time-based codes offline, and verifies you in seconds.",
      },
      { property: "og:title", content: "How AegisGuard TOTP Works" },
      {
        property: "og:description",
        content: "A six-step walkthrough of signal-free, device-based authentication.",
      },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: UserPlus, n: "01", title: "Register", body: "Create your secure AegisGuard account." },
  {
    icon: Smartphone,
    n: "02",
    title: "Set Up Auth",
    body: "Install any standard authenticator app.",
  },
  { icon: QrCode, n: "03", title: "Scan QR", body: "Link your device to the shared secret." },
  { icon: KeyRound, n: "04", title: "Generate Code", body: "A fresh 6-digit TOTP every 30s." },
  { icon: ShieldCheck, n: "05", title: "Verify", body: "Enter the code to prove device ownership." },
  { icon: LockOpen, n: "06", title: "Access Granted", body: "Enter your secure vault instantly." },
];

const facts = [
  {
    title: "Time, not network",
    body: "TOTP derives codes from a shared secret and the current time — no data connection is ever required.",
  },
  {
    title: "Secret stays local",
    body: "The seed never leaves your device after setup, so there is nothing to intercept in transit.",
  },
  {
    title: "Metadata-only logging",
    body: "We record security events, never the contents of your sessions or the codes themselves.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24">
        <section className="relative section-y">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] opacity-40" />
          <div className="container-page relative text-center">
            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight text-gradient md:text-6xl">
              Secure Your Assets. Zero Compromise.
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Understanding the multi-layered defense mechanisms of AegisGuard. We employ advanced
              cryptographic protocols to ensure your identity remains impenetrable.
            </p>
          </div>
        </section>

        <section className="section-y bg-surface-lowest">
          <div className="container-page">
            <h2 className="mb-14 text-center text-3xl font-bold text-foreground md:text-4xl">
              The Authentication Journey
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.n} className="glass glass-hover rounded-2xl p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="grid size-12 place-items-center rounded-xl border border-border bg-cyan/10">
                      <step.icon className="size-6 text-cyan" />
                    </div>
                    <span className="font-mono text-2xl font-bold text-muted-foreground/40">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Why it works offline
              </h2>
              <p className="mb-8 text-muted-foreground">
                Every code is a cryptographic function of your device secret and the clock. The
                server runs the same math independently, so nothing needs to be delivered to you.
              </p>
              <div className="flex flex-col gap-4">
                {facts.map((fact) => (
                  <div key={fact.title} className="glass rounded-xl p-5">
                    <h3 className="mb-1 font-semibold text-foreground">{fact.title}</h3>
                    <p className="text-sm text-muted-foreground">{fact.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass glow-cyan rounded-3xl p-10 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan">
                Live example
              </p>
              <div className="animate-pulse-glow rounded-xl border border-border bg-white/5 py-6 font-mono text-5xl font-bold tracking-widest text-foreground">
                731 204
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Regenerates every 30 seconds, entirely on device.
              </p>
              <Link
                to="/totp-setup"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-6 py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5"
              >
                Set up your authenticator
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
