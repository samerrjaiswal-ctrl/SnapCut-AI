import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Signing in | SnapCut AI" }],
  }),
});

function AuthCallbackPage() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const description =
      search.get("error_description") ||
      hash.get("error_description") ||
      search.get("error") ||
      hash.get("error");
    if (description) {
      setError(description.replace(/\+/g, " "));
    }
  }, []);

  useEffect(() => {
    if (!ready || error) return;
    if (session) {
      void navigate({ to: "/dashboard", replace: true });
      return;
    }

    const timeout = window.setTimeout(() => {
      setError("Sign-in did not complete. Please try logging in again.");
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [error, navigate, ready, session]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="font-label-md text-label-md text-on-surface">{error}</p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md text-on-primary"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Icon name="progress_activity" className="text-secondary animate-spin" />
        <p className="font-label-md text-label-md text-on-surface">Signing you in…</p>
      </div>
    </div>
  );
}
