import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your AegisGuard account" },
      {
        name: "description",
        content:
          "Join AegisGuard and secure your digital assets with device-based TOTP authentication in under two minutes.",
      },
      { property: "og:title", content: "Create your AegisGuard account" },
      {
        property: "og:description",
        content: "Sign up for signal-free two-factor authentication.",
      },
    ],
  }),
  component: Register,
});

function Register() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] opacity-40" />
        <div className="glass relative w-full max-w-md rounded-2xl p-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Create Account</h1>
          <p className="mb-8 text-muted-foreground">Join AegisGuard to secure your digital assets.</p>

          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <Field id="name" label="Full Name" icon={User} type="text" placeholder="Sameer Jaiswal" />
            <Field
              id="email"
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
            />

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  placeholder="••••••••"
                  className="glass w-full rounded-lg px-11 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-cyan focus:ring-4 focus:ring-cyan/20"
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Must be at least 8 characters.</p>
            </div>

            <button
              type="submit"
              className="mt-2 rounded-lg bg-brand-gradient py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--cyan)]"
            >
              Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/verify" className="font-semibold text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  icon: typeof User;
  type: string;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          className="glass w-full rounded-lg px-11 py-3 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-cyan focus:ring-4 focus:ring-cyan/20"
        />
      </div>
    </div>
  );
}
