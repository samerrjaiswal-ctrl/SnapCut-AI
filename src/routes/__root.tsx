import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/components/providers/auth-provider";
import { APP_SHELL_PATHS, AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";
import { Icon } from "@/components/snapcut/icon";
import { SmoothText } from "@/components/snapcut/smooth-text";

function NotFoundComponent() {
  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center relative overflow-hidden">
      <main className="w-full max-w-lg mx-auto px-container-margin-mobile md:px-container-margin-desktop flex flex-col items-center text-center z-10 relative animate-scale-in">
        <div className="mb-8">
          <Icon name="error" className="text-outline-variant" size={64} />
        </div>
        <SmoothText
          as="h1"
          text="404"
          glow
          className="font-display text-display text-primary-container mb-4"
        />
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2 animate-text-smooth delay-2">
          Page not found
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-md mx-auto animate-text-smooth delay-3">
          The page you are looking for might have been removed, had its name changed, or is
          temporarily unavailable.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary h-12 px-8 rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant btn-glow"
        >
          Back to Dashboard
        </Link>
      </main>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 flex justify-center items-center">
        <div className="w-[800px] h-[800px] rounded-full border border-outline-variant absolute notfound-ring" />
        <div
          className="w-[600px] h-[600px] rounded-full border border-outline-variant absolute notfound-ring"
          style={{ animationDuration: "36s", animationDirection: "reverse" }}
        />
        <div
          className="w-[400px] h-[400px] rounded-full border border-outline-variant absolute notfound-ring"
          style={{ animationDuration: "22s" }}
        />
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-on-surface">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary-container px-4 py-2 text-sm font-medium text-on-primary"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "SnapCut AI — Powerful Image Tools. Simple Workflow." },
      {
        name: "description",
        content:
          "Remove text from images, extract text with OCR, and create professional collages in one workspace.",
      },
      { name: "author", content: "SnapCut AI" },
      { property: "og:title", content: "SnapCut AI — Powerful Image Tools. Simple Workflow." },
      {
        property: "og:description",
        content: "Professional image tools for creators and teams.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=block",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=block",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap",
      },
      { rel: "icon", href: "/favicon.svg?v=snapcut-dash", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico?v=snapcut-dash", sizes: "32x32", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=snapcut-dash" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-clip">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inApp = APP_SHELL_PATHS.has(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {inApp ? (
          <AppLayout>
            <Outlet />
          </AppLayout>
        ) : (
          <Outlet />
        )}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
