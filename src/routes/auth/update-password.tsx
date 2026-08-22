import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { useAuth } from "@/components/providers/auth-provider";
import { completeAuthFromUrl, markPasswordRecovery } from "@/lib/auth-recovery";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/update-password")({
  component: UpdatePasswordPage,
  head: () => ({
    meta: [{ title: "Set a new password | SnapCut AI" }],
  }),
});

function UpdatePasswordPage() {
  const { session, ready, completePasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(true);
  const [linkReady, setLinkReady] = useState(false);

  useEffect(() => {
    markPasswordRecovery();
    let cancelled = false;
    void (async () => {
      try {
        await completeAuthFromUrl(supabase);
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setLinkReady(Boolean(data.session));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This reset link is invalid or expired.");
        }
      } finally {
        if (!cancelled) setLinking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completePasswordRecovery(password);
      await navigate({ to: "/login", replace: true, viewTransition: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full h-12 pl-11 pr-4 rounded-xl border border-outline-variant bg-surface focus:border-secondary outline-none font-body-md text-body-md";

  if (!ready || linking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="progress_activity" className="text-secondary animate-spin" />
      </div>
    );
  }

  if (!session && !linkReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="font-label-md text-label-md text-on-surface">
            This reset link is invalid or expired. Request a new one from Forgot password.
          </p>
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
    <div className="bg-background min-h-dvh flex items-center justify-center p-4">
      <form
        className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-8 space-y-5"
        onSubmit={(event) => void save(event)}
      >
        <div className="flex items-center gap-2">
          <Icon name="dashboard" filled className="text-secondary" />
          <span className="font-headline-md text-headline-md font-bold text-on-surface">SnapCut AI</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Set a new password</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Choose a password{session?.email ? ` for ${session.email}` : ""}, then log in.
          </p>
        </div>
        {error ? (
          <p className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">
            {error}
          </p>
        ) : null}
        <label className="block">
          <span className="block font-label-md text-label-md text-on-surface mb-1">New password</span>
          <div className="relative">
            <Icon
              name="lock"
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              className={`${fieldClass} pr-12`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
            </button>
          </div>
        </label>
        <label className="block">
          <span className="block font-label-md text-label-md text-on-surface mb-1">Confirm password</span>
          <div className="relative">
            <Icon
              name="lock"
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              className={fieldClass}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={8}
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
        >
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
      {busy ? <OverlayLoader message="Updating password…" description="Please wait a moment." /> : null}
    </div>
  );
}
