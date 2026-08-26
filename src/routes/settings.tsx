import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { getHistoryStats } from "@/services/history-service";
import {
  clearUnverifiedTotp,
  deleteOwnAccount,
  getPendingTotpFactorId,
  listVerifiedMfaFactors,
  saveNewPassword,
  verifyTotpFactor,
} from "@/services/account-service";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings | SnapCut AI" }],
  }),
});

function SettingsPage() {
  const { session, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const [name, setName] = useState(session?.name ?? "User Workspace");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [passwordChangePending, setPasswordChangePending] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"idle" | "2fa" | "form">("idle");
  const [qrImageReady, setQrImageReady] = useState(false);
  const pendingNewPassword = useRef("");
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const mfaFactorIdRef = useRef<string | null>(null);

  function rememberFactorId(id: string | null) {
    mfaFactorIdRef.current = id;
    setMfaFactorId(id);
  }
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeCount, setRemoveCount] = useState(0);
  const [extractCount, setExtractCount] = useState(0);
  const [collageCount, setCollageCount] = useState(0);
  const [snapyCount, setSnapyCount] = useState(0);
  const [pdfCount, setPdfCount] = useState(0);
  const dirty = name !== (session?.name ?? "User Workspace");

  useEffect(() => {
    if (session?.name) setName(session.name);
  }, [session?.name]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void getHistoryStats(session.userId).then((stats) => {
      setRemoveCount(stats.removeText);
      setExtractCount(stats.extractText);
      setCollageCount(stats.collages);
      setSnapyCount(stats.snapy);
      setPdfCount(stats.pdfOperations);
    });
    void listVerifiedMfaFactors()
      .then((factors) => {
        setTwoFactor(factors.length > 0);
        if (factors[0]?.id) rememberFactorId(factors[0].id);
      })
      .catch(() => {
        // Keep the last known 2FA state if the factor list cannot be loaded.
      });
  }, [session]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success("Account changes saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function resetPasswordForm() {
    pendingNewPassword.current = "";
    setPasswordChangePending(false);
    setPasswordStep("idle");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setMfaCode("");
    setMfaQr(null);
    setMfaSecret(null);
    setQrImageReady(false);
    setQrScanned(false);
  }

  async function startPasswordUpdate() {
    if (mfaBusy) return;
    setPasswordError(null);
    setNewPassword("");
    setConfirmPassword("");
    setMfaCode("");
    setMfaQr(null);
    setMfaSecret(null);
    setQrImageReady(false);
    setQrScanned(false);
    setMfaBusy(true);
    try {
      await clearUnverifiedTotp().catch(() => undefined);
      const factors = await listVerifiedMfaFactors();
      if (factors.length > 0) {
        rememberFactorId(mfaFactorIdRef.current || mfaFactorId || factors[0]?.id || null);
        setTwoFactor(true);
        setQrScanned(true);
        setPasswordStep("2fa");
        return;
      }
      setTwoFactor(false);
      setPasswordStep("form");
      requestAnimationFrame(() => newPasswordRef.current?.focus());
    } catch (error) {
      setPasswordStep("form");
      toast.error(error instanceof Error ? error.message : "Unable to check authenticator status.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (passwordStep !== "form") return;
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordError(null);
    setMfaBusy(true);
    try {
      await saveNewPassword(newPassword);
      resetPasswordForm();
      toast.success("Password updated. You can log out and sign in with the new password.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      if (/nonce|reauth|reauthentication|aal|mfa|second factor|additional/i.test(message)) {
        pendingNewPassword.current = newPassword;
        setPasswordChangePending(true);
        setMfaCode("");
        toast.message("Enter a fresh 6-digit authenticator code to save the new password.");
        return;
      }
      setPasswordError(message);
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleVerifyMfa(event?: FormEvent) {
    event?.preventDefault();
    const digits = mfaCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      toast.error("Enter the 6-digit code from the authenticator app.");
      return;
    }
    setMfaBusy(true);
    try {
      if (passwordChangePending && pendingNewPassword.current) {
        let factorId = mfaFactorIdRef.current || mfaFactorId;
        if (!factorId) {
          const factors = await listVerifiedMfaFactors();
          factorId = factors[0]?.id ?? (await getPendingTotpFactorId());
          if (factorId) rememberFactorId(factorId);
        }
        if (!factorId) {
          toast.error("Authenticator is not ready. Tap Update Password again, then enter a fresh 6-digit code.");
          return;
        }
        await verifyTotpFactor(factorId, digits);
        await saveNewPassword(pendingNewPassword.current);
        pendingNewPassword.current = "";
        resetPasswordForm();
        toast.success("Password updated. You can log out and sign in with the new password.");
        return;
      }

      let factorId = mfaFactorIdRef.current || mfaFactorId;
      if (!factorId) {
        factorId = await getPendingTotpFactorId();
        if (factorId) rememberFactorId(factorId);
      }
      if (!factorId) {
        toast.error("This QR expired. Tap Update Password again, scan the new QR, then enter a fresh 6-digit code.");
        return;
      }
      await verifyTotpFactor(factorId, digits);
      rememberFactorId(factorId);
      setTwoFactor(true);
      setMfaQr(null);
      setMfaSecret(null);
      setQrScanned(false);
      setMfaCode("");
      setPasswordStep("form");
      requestAnimationFrame(() => newPasswordRef.current?.focus());
      toast.success("2FA verified. Set a new password.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code did not match. Try again.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Signed out. Your files are still saved.");
    await navigate({ to: "/", replace: true, viewTransition: true });
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      toast.success("Account and saved files were deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete this account.");
      setDeleting(false);
      return;
    }
    try {
      await logout();
    } catch {
      // Session can already be gone after the account row is deleted.
    }
    await navigate({ to: "/", replace: true, viewTransition: true });
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-container-margin-mobile md:px-container-margin-desktop py-6 md:py-12 min-w-0">
        <header className="mb-8 md:mb-12">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
            Settings
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Manage your account preferences, billing, and security.
          </p>
        </header>

        <div className="flex flex-col gap-12">
            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8 relative overflow-hidden"
              id="profile"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Account
              </h2>
              <form onSubmit={saveProfile}>
                <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <button
                      type="button"
                      className="w-24 h-24 rounded-full bg-surface-container-highest border-2 border-outline-variant overflow-hidden relative group"
                      onClick={() => photoRef.current?.click()}
                      aria-label="Change photo"
                    >
                      {photo ? (
                        <img className="w-full h-full object-cover" alt="" src={photo} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-surface-container-high text-5xl leading-none">
                          👤
                        </span>
                      )}
                      <div className="absolute inset-0 bg-primary/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Icon name="photo_camera" className="text-on-primary" />
                      </div>
                    </button>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={(e) => {
                        const nextFile = e.target.files?.[0];
                        if (!nextFile) return;
                        if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
                        const nextUrl = URL.createObjectURL(nextFile);
                        photoUrlRef.current = nextUrl;
                        setPhoto(nextUrl);
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    <div>
                      <label
                        className="block font-label-md text-label-md text-on-surface-variant mb-1"
                        htmlFor="full-name"
                      >
                        Full Name
                      </label>
                      <input
                        id="full-name"
                        name="name"
                        autoComplete="name"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        className="block font-label-md text-label-md text-on-surface-variant mb-1"
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        autoComplete="email"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface-variant"
                        readOnly
                        type="email"
                        value={session?.email ?? "user@example.com"}
                      />
                      <p className="text-xs text-on-surface-variant mt-1">
                        Email cannot be changed directly.{" "}
                        <a
                          href="mailto:hello@snapcut.ai?subject=Change%20email"
                          className="text-secondary font-medium hover:underline"
                        >
                          Contact support
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-outline-variant">
                  <button
                    type="submit"
                    disabled={saving || !dirty}
                    className="w-full sm:w-auto bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md text-label-md font-semibold hover:bg-on-surface-variant disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8"
              id="account"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Account & Usage
              </h2>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div>
                    <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">
                      Current Plan
                    </h3>
                    <p className="font-headline-md text-headline-md text-on-surface mt-1">
                      {session?.plan === "pro" ? "Pro" : "Free Tier"}
                    </p>
                  </div>
                  <span className="bg-surface-container-highest text-on-surface px-3 py-1 rounded-full text-xs font-semibold border border-outline-variant">
                    Active
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-4">
                  You are currently on the basic free tier with limited AI credits.
                </p>
                <Link
                  to="/pricing"
                  className="inline-flex bg-secondary text-on-secondary px-6 py-2 rounded-lg font-label-md text-label-md font-semibold hover:bg-secondary-container"
                >
                  Upgrade to Pro
                </Link>
              </div>
              <div className="space-y-4">
                <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                  Monthly Usage
                </h3>
                <UsageBar
                  label="Text Removals"
                  value={`${removeCount}`}
                  width={`${Math.min(100, removeCount * 10)}%`}
                  accent="bg-secondary"
                />
                <UsageBar
                  label="Image to Text"
                  value={`${extractCount}`}
                  width={`${Math.min(100, extractCount * 10)}%`}
                  accent="bg-primary"
                />
                <UsageBar
                  label="Collages"
                  value={`${collageCount}`}
                  width={`${Math.min(100, collageCount * 10)}%`}
                  accent="bg-primary-container"
                />
                <UsageBar
                  label="Snapy"
                  value={`${snapyCount}`}
                  width={`${Math.min(100, snapyCount * 10)}%`}
                  accent="bg-secondary-container"
                />
                <UsageBar
                  label="PDF Operations"
                  value={`${pdfCount}`}
                  width={`${Math.min(100, pdfCount * 10)}%`}
                  accent="bg-error-container"
                />
              </div>
            </section>

            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8"
              id="security"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Security
              </h2>
              {passwordStep === "idle" ? (
                <button
                  type="button"
                  disabled={mfaBusy}
                  onClick={() => void startPasswordUpdate()}
                  className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-label-md text-label-md font-semibold border border-outline-variant hover:bg-surface-container-highest disabled:opacity-50"
                >
                  UPDATE PASSWORD
                </button>
              ) : null}
              {passwordStep === "2fa" ? (
                <div id="mfa-qr-panel" className="animate-mfa-panel rounded-xl border border-outline-variant bg-surface p-5 space-y-4">
                  <p className="text-sm text-on-surface-variant text-center">
                    {mfaQr
                      ? "Scan this QR in Google Authenticator, then enter the 6-digit code."
                      : "Enter the 6-digit code from Google Authenticator to continue."}
                  </p>
                  {!qrScanned ? (
                    <div className="relative mx-auto h-44 w-44">
                      {!qrImageReady ? (
                        <div className="mfa-qr-skeleton absolute inset-0 rounded-xl" />
                      ) : null}
                      {mfaQr ? (
                        <img
                          src={mfaQr}
                          alt="Authenticator QR code"
                          className={cn(
                            "h-44 w-44 bg-white p-2 rounded-xl",
                            qrImageReady ? "animate-mfa-qr" : "opacity-0",
                          )}
                          onLoad={() => setQrImageReady(true)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {mfaSecret && !qrScanned ? (
                    <div className="rounded-lg bg-surface-container-low px-3 py-2 text-center">
                      <p className="text-xs text-on-surface-variant mb-1">Can&apos;t scan? Add this key:</p>
                      <p className="font-mono text-sm text-on-surface tracking-widest break-all">
                        {mfaSecret.match(/.{1,4}/g)?.join(" ") ?? mfaSecret}
                      </p>
                    </div>
                  ) : null}
                  {mfaQr && !qrScanned ? (
                    <button
                      type="button"
                      className="w-full border border-outline-variant px-4 py-2 rounded-lg font-label-md text-label-md"
                      onClick={() => setQrScanned(true)}
                    >
                      I scanned the QR — enter 6-digit code
                    </button>
                  ) : null}
                  <form className="space-y-3" onSubmit={(event) => void handleVerifyMfa(event)}>
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 outline-none focus:border-secondary text-center tracking-[0.4em] text-lg"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <button
                      type="submit"
                      disabled={mfaBusy}
                      className="w-full bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-50"
                    >
                      Confirm 2FA
                    </button>
                    <button
                      type="button"
                      className="w-full text-on-surface-variant font-label-md text-label-md hover:underline"
                      onClick={resetPasswordForm}
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              ) : null}
              {passwordStep === "form" ? (
                <form className="space-y-6 animate-mfa-panel" onSubmit={handlePassword}>
                  {passwordError ? <p className="text-sm text-error">{passwordError}</p> : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {twoFactor ? (
                      <div className="md:col-span-2">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                          Current Password
                        </label>
                        <div className="flex items-center gap-3 w-full bg-secondary/10 border border-secondary rounded-lg px-4 py-2">
                          <Icon name="check_circle" className="text-secondary" size={20} filled />
                          <span className="text-sm text-on-surface">Verified by 2FA</span>
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1" htmlFor="new-password">
                        New Password
                      </label>
                      <input
                        id="new-password"
                        ref={newPasswordRef}
                        name="new-password"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:border-secondary outline-none"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1" htmlFor="confirm-new-password">
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-new-password"
                        name="confirm-new-password"
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:border-secondary outline-none"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  {passwordChangePending ? (
                    <div className="space-y-3">
                      <p className="text-sm text-on-surface-variant">
                        Enter a fresh 6-digit authenticator code to save the new password in Supabase.
                      </p>
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 outline-none focus:border-secondary text-center tracking-[0.4em] text-lg"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <button
                        type="button"
                        disabled={mfaBusy}
                        onClick={() => void handleVerifyMfa()}
                        className="w-full bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-50"
                      >
                        Save password
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={mfaBusy}
                        className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-label-md text-label-md font-semibold border border-outline-variant hover:bg-surface-container-highest disabled:opacity-50"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        className="text-on-surface-variant font-label-md text-label-md hover:underline"
                        onClick={resetPasswordForm}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              ) : null}
            </section>

            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8"
              id="session"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Session
              </h2>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-label-md text-label-md font-semibold text-on-surface">Log out</h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Sign out to use another account. Your history and files stay saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-label-md text-label-md font-semibold border border-outline-variant hover:bg-surface-container-highest shrink-0"
                >
                  Log out
                </button>
              </div>
            </section>

            <section
              className="bg-surface-container-lowest border border-error-container rounded-xl p-6 md:p-8 scroll-mt-8"
              id="danger"
            >
              <h2 className="font-headline-md text-headline-md text-error mb-6 border-b border-error-container pb-4">
                Danger Zone
              </h2>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                    Delete Account
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="bg-error-container text-on-error-container px-6 py-2 rounded-lg font-label-md text-label-md font-semibold hover:bg-error hover:text-on-error shrink-0 border border-error/20"
                >
                  Delete Account
                </button>
              </div>
            </section>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-surface-container-lowest border-outline-variant">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your SnapCut account, history files, and profile data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-on-error hover:bg-error/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
            >
              {deleting ? "Deleting…" : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {saving || deleting ? (
        <OverlayLoader
          message={deleting ? "Deleting your account…" : "Saving account…"}
          description="Please wait a moment."
        />
      ) : null}
    </>
  );
}

function UsageBar({
  label,
  value,
  width,
  accent,
}: {
  label: string;
  value: string;
  width: string;
  accent: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-medium text-on-surface">{value}</span>
      </div>
      <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
        <div className={`${accent} h-2 rounded-full`} style={{ width }} />
      </div>
    </div>
  );
}
