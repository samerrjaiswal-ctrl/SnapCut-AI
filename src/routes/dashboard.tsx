import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Laptop,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Security dashboard | AegisGuard" },
      {
        name: "description",
        content:
          "Review your AegisGuard security score, active authentication methods, trusted devices, and recent account activity.",
      },
      { property: "og:title", content: "Security dashboard | AegisGuard" },
      {
        property: "og:description",
        content: "Your account hardening status at a glance.",
      },
    ],
  }),
  component: Dashboard;
});

const devices = [
  { icon: Smartphone, name: "Android Phone", method: "Authenticator", last: "Active now" },
  { icon: Laptop, name: "Windows Laptop", method: "Passkey", last: "2 days ago" },
];

const activity = [
  { label: "Successful login", meta: "Chrome · Mumbai, IN", time: "12 min ago", ok: true },
  { label: "Recovery codes viewed", meta: "Chrome · Mumbai, IN", time: "Yesterday", ok: true },
  { label: "Failed login attempt", meta: "Unknown device · Berlin, DE", time: "3 days ago", ok: false },
];

function Dashboard() {
  const score = 85;

  return (
    <AppShell title="Dashboard">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Welcome back, Sameer</h2>
        <p className="text-muted-foreground">Your account is protected.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass glow-cyan rounded-2xl p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="size-6 text-cyan" />
                <div>
                  <h3 className="font-semibold text-foreground">Account Security</h3>
                  <p className="text-sm text-success">Status: Protected</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-4 text-success" /> Authenticator enabled
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-4 text-success" /> Recovery codes available
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Circle className="size-4" /> Passkey not configured
                </li>
              </ul>
              <Link
                to="/security"
                className="mt-6 inline-flex rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
              >
                Improve Security
              </Link>
            </div>

            <ScoreRing score={score} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 font-semibold text-foreground">Your Devices</h3>
          <div className="flex flex-col gap-3">
            {devices.map((device) => (
              <div
                key={device.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-cyan/10">
                  <device.icon className="size-5 text-cyan" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{device.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {device.method} · {device.last}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/security"
            className="mt-5 inline-block text-sm text-cyan hover:underline"
          >
            Manage Devices
          </Link>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Recent Activity</h3>
          <ul className="flex flex-col divide-y divide-border">
            {activity.map((item) => (
              <li key={item.label + item.time} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${item.ok ? "bg-success" : "bg-destructive"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 font-semibold text-foreground">Authenticator TOTP</h3>
          <div className="rounded-xl border border-border bg-white/5 p-4 text-center">
            <p className="font-mono text-3xl font-bold tracking-widest text-foreground">••••••</p>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" /> Rotates every 30s
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Enabled
          </span>
          <Link
            to="/totp-setup"
            className="mt-5 block text-sm text-cyan hover:underline"
          >
            Manage
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-32 place-items-center">
      <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="absolute font-mono text-2xl font-bold text-foreground">{score}%</span>
    </div>
  );
}
