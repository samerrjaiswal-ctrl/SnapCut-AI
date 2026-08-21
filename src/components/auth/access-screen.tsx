import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { RequireGuest } from "@/components/auth/auth-guards";
import { useAuth } from "@/components/providers/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AccessScreenProps = {
  defaultTab: "login" | "signup";
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function AccessScreen({ defaultTab }: AccessScreenProps) {
  return (
    <RequireGuest>
      <AccessForm defaultTab={defaultTab} />
    </RequireGuest>
  );
}

function AccessForm({ defaultTab }: AccessScreenProps) {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const loginErrors = useMemo(() => {
    const next: { email?: string; password?: string } = {};
    if (loginEmail && !EMAIL_PATTERN.test(loginEmail)) next.email = "Enter a valid email address.";
    if (loginPassword && loginPassword.length < 8)
      next.password = "Password must be at least 8 characters.";
    return next;
  }, [loginEmail, loginPassword]);

  const signupErrors = useMemo(() => {
    const next: { name?: string; email?: string; password?: string; confirm?: string } = {};
    if (name && name.trim().length < 2) next.name = "Enter your full name.";
    if (signupEmail && !EMAIL_PATTERN.test(signupEmail))
      next.email = "Enter a valid email address.";
    if (signupPassword && signupPassword.length < 8)
      next.password = "Password must be at least 8 characters.";
    if (confirm && confirm !== signupPassword) next.confirm = "Passwords do not match.";
    return next;
  }, [name, signupEmail, signupPassword, confirm]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!loginEmail || !loginPassword || Object.keys(loginErrors).length) {
      setError("Please complete the form before continuing.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured yet.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    if (!name || !signupEmail || !signupPassword || !confirm || Object.keys(signupErrors).length) {
      setError("Please complete the form before continuing.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured yet.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result = await signup(name.trim(), signupEmail, signupPassword);
      if (result.needsConfirmation) {
        setTab("login");
        setNotice(
          "Account created. Check your email to confirm, then log in. If you already signed up, use Log In instead of creating a new account.",
        );
        return;
      }
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in is not available right now. Please use email instead.",
      );
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface focus:border-secondary focus:ring-2 focus:ring-secondary-fixed-dim outline-none font-body-md text-body-md transition-transform duration-200 focus:scale-[1.01]";

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="login-glow login-glow-a" />
      <div className="login-glow login-glow-b" />
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden relative z-10 login-card">
        <div className="p-8 pb-4 text-center">
          <h1 className="font-display text-display text-primary-container tracking-tight animate-text-glow">
            <span className="inline-block animate-text-smooth">SnapCut</span>
            &nbsp;
            <span className="inline-block animate-text-smooth delay-2">AI</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 animate-text-smooth delay-3">
            Professional media tools.
          </p>
        </div>

        <div className="flex border-b border-outline-variant" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={cn(
              "flex-1 py-4 text-center font-label-md text-label-md",
              tab === "login"
                ? "font-bold text-secondary border-b-2 border-secondary bg-surface-bright"
                : "text-on-surface-variant hover:text-secondary",
            )}
            onClick={() => {
              setTab("login");
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signup"}
            className={cn(
              "flex-1 py-4 text-center font-label-md text-label-md",
              tab === "signup"
                ? "font-bold text-secondary border-b-2 border-secondary bg-surface-bright"
                : "text-on-surface-variant hover:text-secondary",
            )}
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
          >
            Sign Up
          </button>
        </div>

        <div className="p-8">
          {error ? (
            <p
              className="mb-4 rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              className="mb-4 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface"
              role="status"
            >
              {notice}
            </p>
          ) : null}

          {tab === "login" ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label
                    className="block font-label-md text-label-md text-on-surface mb-1"
                    htmlFor="login-email"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    className={fieldClass}
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  {loginErrors.email ? (
                    <p className="mt-1 text-sm text-error">{loginErrors.email}</p>
                  ) : null}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      className="block font-label-md text-label-md text-on-surface"
                      htmlFor="login-password"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="font-label-sm text-label-sm text-secondary hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      className={`${fieldClass} pr-12`}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                    </button>
                  </div>
                  {loginErrors.password ? (
                    <p className="mt-1 text-sm text-error">{loginErrors.password}</p>
                  ) : null}
                </div>
              </div>
              <button
                className="w-full h-12 bg-primary-container text-on-primary flex items-center justify-center rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Log In"}
              </button>
              <p className="text-center font-body-md text-body-md text-on-surface-variant">
                New here?{" "}
                <button
                  type="button"
                  className="text-secondary font-medium hover:underline"
                  onClick={() => {
                    setTab("signup");
                    setError(null);
                  }}
                >
                  Create account
                </button>
              </p>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-outline-variant" />
                <span className="flex-shrink-0 mx-4 font-label-sm text-label-sm text-on-surface-variant uppercase">
                  or
                </span>
                <div className="flex-grow border-t border-outline-variant" />
              </div>
              <button
                className="w-full h-12 bg-surface-container-lowest border border-outline-variant text-on-surface flex items-center justify-center gap-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low disabled:opacity-60 hover-lift"
                type="button"
                onClick={handleGoogle}
                disabled={loading}
              >
                <Icon name="account_circle" size={20} />
                Continue with Google
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSignup}>
              <div className="space-y-4">
                <div>
                  <label
                    className="block font-label-md text-label-md text-on-surface mb-1"
                    htmlFor="signup-name"
                  >
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    className={fieldClass}
                    placeholder="Jane Doe"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  {signupErrors.name ? (
                    <p className="mt-1 text-sm text-error">{signupErrors.name}</p>
                  ) : null}
                </div>
                <div>
                  <label
                    className="block font-label-md text-label-md text-on-surface mb-1"
                    htmlFor="signup-email"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    className={fieldClass}
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                  {signupErrors.email ? (
                    <p className="mt-1 text-sm text-error">{signupErrors.email}</p>
                  ) : null}
                </div>
                <div>
                  <label
                    className="block font-label-md text-label-md text-on-surface mb-1"
                    htmlFor="signup-password"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    className={fieldClass}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  {signupErrors.password ? (
                    <p className="mt-1 text-sm text-error">{signupErrors.password}</p>
                  ) : null}
                </div>
                <div>
                  <label
                    className="block font-label-md text-label-md text-on-surface mb-1"
                    htmlFor="signup-confirm"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    className={fieldClass}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  {signupErrors.confirm ? (
                    <p className="mt-1 text-sm text-error">{signupErrors.confirm}</p>
                  ) : null}
                </div>
              </div>
              <button
                className="w-full h-12 bg-primary-container text-on-primary flex items-center justify-center rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p className="text-center font-body-md text-body-md text-on-surface-variant">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-secondary font-medium hover:underline"
                  onClick={() => {
                    setTab("login");
                    setError(null);
                  }}
                >
                  Log in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
