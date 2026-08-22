import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { RequireGuest } from "@/components/auth/auth-guards";
import { useAuth } from "@/components/providers/auth-provider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { resendSignupEmail } from "@/services/account-service";
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
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [takenSignupEmail, setTakenSignupEmail] = useState<string | null>(null);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

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
    else if (
      takenSignupEmail &&
      signupEmail.trim().toLowerCase() === takenSignupEmail.trim().toLowerCase()
    ) {
      next.email = "This email is already registered. Use a different email, or log in.";
    }
    if (signupPassword && signupPassword.length < 8)
      next.password = "Password must be at least 8 characters.";
    if (confirm && confirm !== signupPassword) next.confirm = "Passwords do not match.";
    return next;
  }, [name, signupEmail, signupPassword, confirm, takenSignupEmail]);

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
      await navigate({ to: "/", replace: true, viewTransition: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in. Please try again.";
      setError(message);
      if (message.toLowerCase().includes("confirm your email")) {
        setPendingConfirmEmail(loginEmail);
      }
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
    setPendingConfirmEmail(null);
    setLoading(true);
    try {
      const result = await signup(name.trim(), signupEmail, signupPassword);
      setTakenSignupEmail(null);
      setLoginEmail(signupEmail);
      if (!result.needsConfirmation) setLoginPassword(signupPassword);
      setTab("login");
      setPendingConfirmEmail(result.needsConfirmation ? signupEmail : null);
      setNotice(
        result.needsConfirmation
          ? "Account created. Check your inbox (and spam) for the confirmation link, then log in."
          : "Account created. Log in to continue.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account. Please try again.";
      const alreadyExists =
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("already registered");
      if (alreadyExists) {
        setTakenSignupEmail(signupEmail.trim());
        setError("This email is already registered. Use a different email, or log in.");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const email = pendingConfirmEmail || loginEmail;
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      await resendSignupEmail(email);
      setNotice("Confirmation email sent again. Check your inbox and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend the confirmation email.");
    } finally {
      setResending(false);
    }
  }

  function switchTab(next: "login" | "signup") {
    setTab(next);
    setError(null);
    setNotice(null);
    if (next === "signup") setTakenSignupEmail(null);
  }

  const fieldClass =
    "auth-input w-full h-12 pl-11 pr-4 rounded-xl border border-outline-variant bg-surface focus:border-secondary outline-none font-body-md text-body-md";

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col items-center justify-center p-4 py-8 sm:p-6 relative overflow-x-hidden overflow-y-auto auth-page">
      <div className="login-glow login-glow-a" />
      <div className="login-glow login-glow-b" />
      <div className="relative z-10 w-full max-w-5xl bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden auth-shell">
        {error ? (
          <div
            className="mx-4 sm:mx-6 mt-4 sm:mt-6 rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
            role="alert"
          >
            <p>{error}</p>
            {pendingConfirmEmail ? (
              <button
                type="button"
                className="mt-2 font-medium underline disabled:opacity-60"
                onClick={() => void handleResend()}
                disabled={resending}
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </button>
            ) : null}
          </div>
        ) : null}
        {notice ? (
          <div
            className="mx-4 sm:mx-6 mt-4 sm:mt-6 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface"
            role="status"
          >
            <p>{notice}</p>
            {pendingConfirmEmail ? (
              <button
                type="button"
                className="mt-2 text-secondary font-medium hover:underline disabled:opacity-60"
                onClick={() => void handleResend()}
                disabled={resending}
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative grid md:grid-cols-2 min-h-0 md:min-h-[640px]">
            <div
              className={cn(
                "auth-panel p-5 sm:p-8 md:p-10 flex flex-col justify-center",
                tab === "login" ? "auth-panel-active" : "auth-panel-idle",
              )}
              aria-hidden={tab !== "login"}
              inert={tab !== "login"}
            >
              <form className="space-y-5" onSubmit={handleLogin}>
                <BrandMark />
                <div>
                  <h2
                    className="font-headline-md text-headline-md text-on-surface animate-text-glow"
                    aria-label="Log In"
                  >
                    <span className="inline-block animate-text-smooth">Log</span>
                    &nbsp;
                    <span className="inline-block animate-text-smooth delay-2">In</span>
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 animate-text-smooth delay-3">
                    Professional media tools.
                  </p>
                </div>
                <AuthField
                  id="login-email"
                  label="Email"
                  icon="mail"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={loginEmail}
                  onChange={setLoginEmail}
                  error={loginErrors.email}
                  className={fieldClass}
                />
                <AuthField
                  id="login-password"
                  label="Password"
                  icon="lock"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  error={loginErrors.password}
                  className={`${fieldClass} pr-12`}
                  trailing={
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                    </button>
                  }
                />
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="font-label-md text-label-md text-secondary hover:underline"
                    onClick={() => {
                      setError(null);
                      setForgotOpen(true);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  className="w-full h-12 bg-primary-container text-on-primary flex items-center justify-center gap-2 rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing in…" : "Log In"}
                  <Icon name="arrow_forward" size={18} />
                </button>
                <p className="text-center font-body-md text-body-md text-on-surface-variant md:hidden">
                  New here?{" "}
                  <button
                    type="button"
                    className="text-secondary font-medium hover:underline"
                    onClick={() => switchTab("signup")}
                  >
                    Create account
                  </button>
                </p>
              </form>
            </div>

            <div
              className={cn(
                "auth-panel p-5 sm:p-8 md:p-10 flex flex-col justify-center",
                tab === "signup" ? "auth-panel-active" : "auth-panel-idle",
              )}
              aria-hidden={tab !== "signup"}
              inert={tab !== "signup"}
            >
              <form className="space-y-4" onSubmit={handleSignup}>
                <BrandMark />
                <div>
                  <h2
                    className="font-headline-md text-headline-md text-on-surface animate-text-glow"
                    aria-label="Sign Up"
                  >
                    <span className="inline-block animate-text-smooth">Sign</span>
                    &nbsp;
                    <span className="inline-block animate-text-smooth delay-2">Up</span>
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1 animate-text-smooth delay-3">
                    Professional media tools.
                  </p>
                </div>
                <AuthField
                  id="signup-name"
                  label="Full Name"
                  icon="person"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={setName}
                  error={signupErrors.name}
                  className={fieldClass}
                />
                <AuthField
                  id="signup-email"
                  label="Email"
                  icon="mail"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={signupEmail}
                  onChange={(value) => {
                    setSignupEmail(value);
                    if (takenSignupEmail) setTakenSignupEmail(null);
                  }}
                  error={signupErrors.email}
                  className={fieldClass}
                />
                <AuthField
                  id="signup-password"
                  label="Password"
                  icon="lock"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={setSignupPassword}
                  error={signupErrors.password}
                  className={`${fieldClass} pr-12`}
                  trailing={
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                    </button>
                  }
                />
                <ul className="space-y-1 text-sm">
                  <Rule ok={signupPassword.length >= 8} label="Password must be at least 8 characters." />
                  <Rule
                    ok={Boolean(confirm) && confirm === signupPassword}
                    label="Passwords do not match."
                    match
                  />
                </ul>
                <AuthField
                  id="signup-confirm"
                  label="Confirm Password"
                  icon="lock"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={setConfirm}
                  error={signupErrors.confirm}
                  className={fieldClass}
                />
                <button
                  className="w-full h-12 bg-primary-container text-on-primary flex items-center justify-center gap-2 rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Create Account"}
                  <Icon name="arrow_forward" size={18} />
                </button>
                <p className="text-center font-body-md text-body-md text-on-surface-variant md:hidden">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-secondary font-medium hover:underline"
                    onClick={() => switchTab("login")}
                  >
                    Log in
                  </button>
                </p>
              </form>
            </div>

            <div
              className={cn(
                "auth-overlay hidden md:flex absolute inset-y-0 left-0 w-1/2 z-20 flex-col items-center justify-center px-6 lg:px-10 text-center bg-primary-container text-on-primary overflow-hidden",
                tab === "signup" ? "auth-overlay-signup" : "auth-overlay-login",
              )}
            >
              <div className="login-glow login-glow-a opacity-40" />
              <div key={tab} className="auth-overlay-copy relative z-10 flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-on-primary/10 flex items-center justify-center auth-float">
                  <Icon name="dashboard" filled className="text-secondary" size={32} />
                </div>
                <h2 className="font-headline-md text-headline-md text-on-primary animate-text-glow">
                  {tab === "login" ? (
                    <>
                      <span className="inline-block animate-text-smooth">SnapCut</span>
                      &nbsp;
                      <span className="inline-block animate-text-smooth delay-2">AI</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-block animate-text-smooth">Create</span>
                      &nbsp;
                      <span className="inline-block animate-text-smooth delay-2">account</span>
                    </>
                  )}
                </h2>
                <p className="font-body-md text-body-md text-on-primary-container max-w-sm animate-text-smooth delay-3">
                  Professional media tools.
                </p>
                <ul className="space-y-2 text-sm text-on-primary-container">
                  {["Remove Text", "Image to Text", "Collage Maker"].map((item, index) => (
                    <li
                      key={item}
                      className="flex items-center justify-center gap-2 animate-text-smooth"
                      style={{ animationDelay: `${280 + index * 80}ms` }}
                    >
                      <Icon name="check_circle" size={18} className="text-secondary" />
                      {item}
                    </li>
                  ))}
                </ul>
                {tab === "login" ? (
                  <div className="mt-2">
                    <p className="font-body-md text-body-md text-on-primary-container mb-3">New here?</p>
                    <button
                      type="button"
                      className="px-6 h-11 rounded-xl border border-on-primary/30 text-on-primary font-label-md text-label-md hover-lift"
                      onClick={() => switchTab("signup")}
                    >
                      Create account
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="font-body-md text-body-md text-on-primary-container mb-3">
                      Already have an account?
                    </p>
                    <button
                      type="button"
                      className="px-6 h-11 rounded-xl border border-on-primary/30 text-on-primary font-label-md text-label-md hover-lift"
                      onClick={() => switchTab("login")}
                    >
                      Log in
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
      <ForgotPasswordDialog
        open={forgotOpen}
        email={loginEmail}
        onOpenChange={setForgotOpen}
        onCompleted={(email) => {
          setLoginEmail(email);
          setLoginPassword("");
          setTab("login");
          setError(null);
          setNotice("Check your inbox and open the Reset password link.");
        }}
      />
      {loading ? (
        <OverlayLoader
          message={tab === "signup" ? "Creating your account…" : "Signing you in…"}
          description="Please wait a moment."
        />
      ) : null}
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon name="dashboard" filled className="text-secondary" />
      <span className="font-headline-md text-headline-md font-bold text-on-surface">SnapCut AI</span>
    </div>
  );
}

function Rule({ ok, label, match }: { ok: boolean; label: string; match?: boolean }) {
  return (
    <li className={cn("flex items-center gap-2", ok ? "text-secondary" : "text-on-surface-variant")}>
      <Icon name={ok ? "check_circle" : "radio_button_unchecked"} size={16} />
      {match ? (ok ? "Passwords match." : "Passwords do not match.") : label}
    </li>
  );
}

function AuthField({
  id,
  label,
  icon,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
  className,
  trailing,
}: {
  id: string;
  label: string;
  icon: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  className: string;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Icon
          name={icon}
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          id={id}
          className={className}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        {trailing}
      </div>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  );
}
