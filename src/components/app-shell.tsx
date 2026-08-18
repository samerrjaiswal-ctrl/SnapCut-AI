import { Link } from "@tanstack/react-router";
import { Bell, Home, LayoutDashboard, ShieldCheck, User } from "lucide-react";
import type { ReactNode } from "react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/security", label: "Security", icon: ShieldCheck },
  { to: "/totp-setup", label: "Authenticator", icon: User },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-6 lg:flex">
          <Link to="/" className="glow-hover icon-spin-hover mb-10 flex items-center gap-2 rounded-lg">
            <ShieldCheck className="size-7 text-sidebar-primary" />
            <span className="text-xl font-bold text-sidebar-primary">AegisGuard</span>
          </Link>

          <div className="glass mb-8 rounded-xl p-4">
            <p className="font-semibold text-sidebar-foreground">Security Admin</p>
            <p className="text-xs text-muted-foreground">Premium Tier</p>
          </div>

          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                }}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="glow-hover animate-shimmer mt-auto rounded-xl bg-brand-gradient p-4">
            <p className="text-sm font-semibold text-brand-foreground">Upgrade Plan</p>
            <p className="mt-1 text-xs text-brand-foreground/80">
              Unlock passkeys and team recovery.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl md:px-8">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success sm:inline-flex">
                <span className="size-2 rounded-full bg-success" />
                System Secure
              </span>
              <Link
                to="/"
                aria-label="Go to home page"
                className="glass glass-hover glow-hover icon-spin-hover inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground"
              >
                <Home className="size-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <button
                type="button"
                aria-label="Notifications"
                className="glass glass-hover glow-hover rounded-full p-2 text-muted-foreground"
              >
                <Bell className="size-5" />
              </button>
              <span className="glass grid size-9 place-items-center rounded-full text-primary">
                <User className="size-5" />
              </span>
            </div>
          </header>

          <main className="px-5 py-8 md:px-8">{children}</main>

          <nav className="sticky bottom-0 flex items-center justify-around border-t border-border bg-surface/90 py-3 backdrop-blur-xl lg:hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="interactive flex flex-col items-center gap-1 text-xs text-muted-foreground hover:-translate-y-0.5 hover:text-primary"
                activeProps={{ className: "text-primary" }}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
