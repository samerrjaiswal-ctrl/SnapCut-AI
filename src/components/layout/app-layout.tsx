import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Icon } from "@/components/snapcut/icon";
import { stitchImages } from "@/data/assets";
import { RequireAuth } from "@/components/auth/auth-guards";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

type AppLayoutProps = {
  children: ReactNode;
  contentClassName?: string;
};

export function AppLayout({ children, contentClassName }: AppLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();

  return (
    <RequireAuth>
    <div className="bg-background text-on-surface min-h-screen flex flex-col md:flex-row antialiased">
      <header className="md:hidden sticky top-0 z-40 bg-surface border-b border-outline-variant flex justify-between items-center w-full px-container-margin-mobile h-16">
        <div className="flex items-center gap-3">
          <Icon name="dashboard" filled className="text-secondary" />
          <span className="font-headline-md text-headline-md font-bold text-on-surface">
            SnapCut AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-on-surface-variant hover:text-secondary"
            aria-label="Notifications"
          >
            <Icon name="notifications" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
            <img
              alt={session?.name ?? "User workspace"}
              className="w-full h-full object-cover"
              src={stitchImages.avatar}
            />
          </div>
        </div>
      </header>

      <Sidebar activePath={pathname} />

      <main
        key={pathname}
        className={cn(
          "flex-grow md:ml-sidebar-width min-h-screen bg-background pb-24 md:pb-container-margin-desktop animate-page-enter",
          contentClassName,
        )}
      >
        {children}
      </main>

      <MobileNav activePath={pathname} />
    </div>
    </RequireAuth>
  );
}
