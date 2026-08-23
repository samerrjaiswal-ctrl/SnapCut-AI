import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Icon } from "@/components/snapcut/icon";
import { RequireAuth } from "@/components/auth/auth-guards";
import { useAuth } from "@/components/providers/auth-provider";
import { SnapyWidget } from "@/components/snapy/snapy-widget";
import { cn } from "@/lib/utils";

type AppLayoutProps = {
  children: ReactNode;
};

const MAIN_BY_PATH: Record<string, string> = {
  "/dashboard": "p-container-margin-mobile md:p-container-margin-desktop",
  "/history": "p-container-margin-mobile md:p-container-margin-desktop",
  "/remove-text": "flex flex-col min-h-screen",
  "/image-to-text": "flex flex-col min-h-screen",
};

export const APP_SHELL_PATHS = new Set([
  "/dashboard",
  "/remove-text",
  "/image-to-text",
  "/collage-maker",
  "/history",
  "/settings",
]);

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  const isCollage = pathname === "/collage-maker";

  return (
    <RequireAuth>
      <div
        className={cn(
          "bg-background text-on-surface flex flex-col lg:flex-row antialiased overflow-x-clip",
          isCollage ? "h-dvh overflow-hidden" : "min-h-screen",
        )}
      >
        <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-outline-variant flex justify-between items-center w-full min-w-0 px-container-margin-mobile h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
              <Icon name="dashboard" filled className="text-secondary" size={22} />
            </div>
            <span className="font-headline-md text-headline-md font-bold text-on-surface truncate">
              SnapCut AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/history"
              preload="intent"
              className="text-on-surface-variant hover:text-secondary"
              aria-label="History"
            >
              <Icon name="history" />
            </Link>
            <div
              className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center text-sm leading-none"
              aria-label={session?.name ?? "User workspace"}
            >
              👤
            </div>
          </div>
        </header>

        <Sidebar activePath={pathname} />

        <main
          className={cn(
            "flex-grow w-full min-w-0 lg:ml-sidebar-width lg:w-[calc(100%-var(--spacing-sidebar-width))] bg-background",
            isCollage
              ? "flex flex-col h-full min-h-0 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
              : cn(
                  "min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-container-margin-desktop",
                  MAIN_BY_PATH[pathname],
                ),
          )}
        >
          <div
            key={pathname}
            className={cn(
              "app-feature-fade",
              isCollage ? "flex h-full min-h-0 flex-col overflow-hidden" : "min-h-full h-full",
            )}
          >
            {children}
          </div>
        </main>

        <MobileNav activePath={pathname} />
        <SnapyWidget />
      </div>
    </RequireAuth>
  );
}
