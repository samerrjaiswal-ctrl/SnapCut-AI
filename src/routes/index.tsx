import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BatteryFull,
  CheckCircle2,
  Clock,
  Fingerprint,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  SignalLow,
  SignalZero,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AegisGuard — Authentication Without Waiting for SMS" },
      {
        name: "description",
        content:
          "Sign in securely with device-generated TOTP codes. AegisGuard works in dead zones, in transit, and anywhere SMS fails.",
      },
      { property: "og:title", content: "AegisGuard — Authentication Without Waiting for SMS" },
      {
        property: "og:description",
        content: "Device-based TOTP security that keeps working when mobile signal doesn't.",
      },
    ],
  }),
  component: Landing,
});

const problems = [
  {
    icon: SignalZero,
    title: "Dead Zones",
    body: "No bars, no code. SMS one-time passwords simply never arrive in weak-signal areas.",
  },
  {
    icon: Clock,
    title: "Delivery Delays",
    body: "Carrier queues push codes past their expiry window, locking you out of your own account.",
  },
  {
    icon: ShieldAlert,
    title: "SIM Swap Attacks",
    body: "Phone numbers can be hijacked. A device-held secret cannot be socially engineered away.",
  },
];

const features = [
  {
    icon: Smartphone,
    title: "Offline Code Generation",
    body: "Your TOTP secret lives on your device, so codes generate with zero connectivity.",
  },
  {
    icon: ShieldCheck,
    title: "Security Score",
    body: "A live summary of how hardened your account is, with clear next steps.",
  },
  {
    icon: Fingerprint,
    title: "Passkey Ready",
    body: "Layer passwordless sign-in on top of TOTP whenever you're ready.",
  },
  {
    icon: KeyRound,
    title: "Recovery Codes",
    body: "Twelve single-use emergency codes keep you covered if a device is lost.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-24">
        {/* Hero */}
        <section className="relative flex min-h-[88vh] items-center overflow-hidden py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_60%)] opacity-40" />
          <div className="container-page relative z-10 grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <div className="glass glow-cyan mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2">
                <span className="size-2 animate-pulse rounded-full bg-cyan" />
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan">
                  Next-Gen Authentication
                </span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-gradient md:text-6xl lg:text-[72px]">
                Authentication Without Waiting for SMS
              </h1>
              <p className="mb-10 max-w-xl text-lg text-muted-foreground">
                Securely authenticate using your device even when mobile signal is weak or SMS
                delivery is unreliable.
              </p>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-8 py-4 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--cyan)]"
                >
                  Get Started
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center rounded-lg border border-border px-8 py-4 font-semibold text-foreground transition hover:bg-surface-high"
                >
                  See How It Works
                </Link>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="size-5 text-success" />
                <span className="text-sm">No SMS required. Instant verification.</span>
              </div>
            </div>

            {/* Phone mock */}
            <div className="relative hidden h-[600px] items-center justify-center lg:flex">
              <div className="absolute size-64 rounded-full bg-cyan/20 blur-[100px]" />
              <div className="glass animate-float relative flex h-[600px] w-[300px] flex-col rounded-[40px] p-4">
                <div className="flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-border bg-surface-high">
                  <div className="flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
                    <span>9:41</span>
                    <div className="flex gap-2">
                      <SignalLow className="size-4" />
                      <WifiOff className="size-4" />
                      <BatteryFull className="size-4" />
                    </div>
                  </div>
                  <div className="border-b border-border px-6 py-6">
                    <h3 className="text-xl font-semibold text-foreground">Authenticator</h3>
                    <p className="mt-1 text-sm text-muted-foreground">AegisGuard Secure</p>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan">
                      Authenticator Code
                    </p>
                    <div className="animate-pulse-glow w-full rounded-lg border border-border bg-white/5 px-2 py-4 font-mono text-4xl font-bold tracking-widest text-foreground">
                      482 913
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-low">
                        <div className="h-full w-3/5 rounded-full bg-cyan" />
                      </div>
                      <span className="text-xs text-muted-foreground">Changes in 30s</span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="glass animate-float absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-3 rounded-xl p-4"
                style={{ animationDelay: "-3s" }}
              >
                <ShieldCheck className="size-7 text-cyan" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Verified</span>
                  <span className="text-xs text-muted-foreground">Instant Access</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="section-y bg-surface-lowest">
          <div className="container-page">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">
                When SMS OTP Isn&apos;t Reliable
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Traditional SMS authentication is vulnerable to network issues, delays, and
                interception. It&apos;s time for a more robust solution.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {problems.map((item) => (
                <div key={item.title} className="glass glass-hover rounded-2xl p-8">
                  <div className="mb-6 grid size-12 place-items-center rounded-full border border-destructive/20 bg-destructive/10">
                    <item.icon className="size-6 text-destructive" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-y">
          <div className="container-page">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">
                Security That Travels With You
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Everything you need to harden your account, built for people who work far from a
                reliable signal.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((item) => (
                <div key={item.title} className="glass glass-hover glow-cyan rounded-2xl p-6">
                  <div className="mb-5 grid size-12 place-items-center rounded-xl border border-border bg-cyan/10">
                    <item.icon className="size-6 text-cyan" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-y">
          <div className="container-page">
            <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent),transparent_65%)] opacity-50" />
              <div className="relative">
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  Set up signal-free 2FA in two minutes
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
                  Scan a QR code once and your device generates verified codes forever — online or
                  off.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-8 py-4 font-semibold text-primary-foreground transition hover:-translate-y-0.5"
                >
                  Create your account
                  <ArrowRight className="size-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
