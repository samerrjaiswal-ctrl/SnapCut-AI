import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Signing in | SnapCut AI" }],
  }),
});

function AuthCallbackPage() {
  const { session, ready, passwordRecovery } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [recoveryFlow, setRecoveryFlow] = useState(false);

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
      return;
    }

    const code = search.get("code");
    const tokenHash = search.get("token_hash") || hash.get("token_hash");
    const type = (search.get("type") || hash.get("type")) as EmailOtpType | null;
    if (type === "recovery") {
      setRecoveryFlow(true);
      sessionStorage.setItem("snapcut-password-recovery", "1");
    }

    let cancelled = false;

    async function completeAuth() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && exchangeError) {
          setError(exchangeError.message.replace(/\+/g, " "));
        }
        return;
      }

      if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (!cancelled && otpError) {
          setError(otpError.message.replace(/\+/g, " "));
        }
      }
    }

    void completeAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || error) return;
    if (session) {
      const recovering =
        recoveryFlow ||
        passwordRecovery ||
        sessionStorage.getItem("snapcut-password-recovery") === "1";
      void navigate({
        to: recovering ? "/auth/update-password" : "/",
        replace: true,
        viewTransition: true,
      });
      return;
    }

    const timeout = window.setTimeout(() => {
      setError("Sign-in did not complete. Please try logging in again.");
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [error, navigate, passwordRecovery, ready, recoveryFlow, session]);

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
