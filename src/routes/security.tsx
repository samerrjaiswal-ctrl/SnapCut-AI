import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Fingerprint,
  Laptop,
  LogOut,
  Plus,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security settings | AegisGuard" },
      {
        name: "description",
        content:
          "Manage your authenticator, passkeys, recovery codes, and trusted devices from one AegisGuard security console.",
      },
      { property: "og:title", content: "Security settings | AegisGuard" },
      {
        property: "og:description",
        content: "Granular control over every authentication method on your account.",
      },
    ],
  }),
  component: Security,
});

const methods = [
  {
    icon: ShieldCheck,
    title: "Authenticator",
    status: "Enabled",
    tone: "success" as const,
    action: "Manage",
    to: "/totp-setup" as const,
  },
  {
    icon: Fingerprint,
    title: "Passkey",
    status: "Not configured",
    tone: "muted" as const,
    action: "Add",
    to: "/totp-setup" as const,
  },
  {
    icon: FileText,
    title: "Recovery Codes",
    status: "12 available",
    tone: "success" as const,
    action: "Manage",
    to: "/recovery-codes" as const,
  },
];

const trusted = [
  { icon: Smartphone, name: "Android Phone", meta: "Mumbai, IN · Active now" },
  { icon: Laptop, name: "Windows Laptop", meta: "Mumbai, IN · 2 days ago" },
];

function Security() {
  return (
    <AppShell title="Security">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Security</h2>
        <p className="mb-8 text-muted-foreground">
          Manage your account security, authentication methods, and recovery options.
        </p>

        <section className="mb-10">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Authentication methods
          </h3>
          <div className="flex flex-col gap-3">
            {methods.map((method) => (
              <div
                key={method.title}
                className="glass glass-hover flex flex-wrap items-center justify-between gap-4 rounded-xl p-5"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-cyan/10">
                    <method.icon className="size-5 text-cyan" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{method.title}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        method.tone === "success"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {method.status}
                    </span>
                  </div>
                </div>
                <Link
                  to={method.to}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-high"
                >
                  {method.action === "Add" ? <Plus className="size-4" /> : null}
                  {method.action}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted devices
          </h3>
          <div className="glass divide-y divide-border rounded-xl">
            {trusted.map((device) => (
              <div key={device.name} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <device.icon className="size-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.meta}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm text-destructive transition hover:opacity-80"
                >
                  <LogOut className="size-4" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-xl p-6">
          <h3 className="mb-2 font-semibold text-foreground">Danger zone</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Resetting two-factor authentication invalidates every device and recovery code.
          </p>
          <button
            type="button"
            className="rounded-lg border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
          >
            Reset two-factor authentication
          </button>
        </section>
      </div>
    </AppShell>
  );
}
