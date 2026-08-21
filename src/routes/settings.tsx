import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { getHistoryStats } from "@/services/history-service";
import { stitchImages } from "@/data/assets";
import { Switch } from "@/components/ui/switch";
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
  const { session, updateProfile, updatePassword, logout } = useAuth();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState("profile");
  const [name, setName] = useState(session?.name ?? "User Workspace");
  const [photo, setPhoto] = useState<string>(stitchImages.avatar);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeCount, setRemoveCount] = useState(0);
  const [extractCount, setExtractCount] = useState(0);
  const dirty = name !== (session?.name ?? "User Workspace");

  const nav = useMemo(
    () => [
      { id: "profile", label: "Profile" },
      { id: "account", label: "Account & Usage" },
      { id: "security", label: "Security" },
      { id: "danger", label: "Danger Zone" },
    ],
    [],
  );

  useEffect(() => {
    if (session?.name) setName(session.name);
  }, [session?.name]);

  useEffect(() => {
    if (!session) return;
    void getHistoryStats(session.userId).then((stats) => {
      setRemoveCount(stats.removeText);
      setExtractCount(stats.extractText);
    });
  }, [session]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success("Profile changes saved.");
    } catch {
      toast.error("Unable to save profile changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setPasswordError("Passwords must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordError(null);
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password.");
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-container-margin-mobile md:px-container-margin-desktop py-8 md:py-12">
        <header className="mb-8 md:mb-12">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2 animate-text-smooth">
            Settings
          </h1>
          <p className="text-on-surface-variant font-body-md text-body-md animate-text-smooth delay-2">
            Manage your account preferences, billing, and security.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="md:w-1/4 shrink-0 hidden md:block sticky top-8 self-start">
            <ul className="flex flex-col gap-1 font-label-md text-label-md">
              {nav.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "block px-4 py-2 rounded-lg",
                      section === item.id
                        ? "bg-surface-container-highest text-secondary font-semibold"
                        : item.id === "danger"
                          ? "text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 flex flex-col gap-12">
            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8 relative overflow-hidden"
              id="profile"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Profile
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
                      <img className="w-full h-full object-cover" alt="" src={photo} />
                      <div className="absolute inset-0 bg-primary/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Icon name="photo_camera" className="text-on-primary" />
                      </div>
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-secondary"
                      onClick={() => photoRef.current?.click()}
                    >
                      Change Photo
                    </button>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPhoto(URL.createObjectURL(file));
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
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface-variant"
                        readOnly
                        type="email"
                        value={session?.email ?? "user@example.com"}
                      />
                      <p className="text-xs text-on-surface-variant mt-1">
                        Email cannot be changed directly. Contact support.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-outline-variant">
                  <button
                    type="submit"
                    disabled={saving || !dirty}
                    className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md text-label-md font-semibold hover:bg-on-surface-variant disabled:opacity-50"
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
                <div className="flex justify-between items-center mb-4">
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
              </div>
            </section>

            <section
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 scroll-mt-8"
              id="security"
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                Security
              </h2>
              <form className="space-y-6" onSubmit={handlePassword}>
                <div>
                  <h3 className="font-label-md text-label-md font-semibold text-on-surface mb-4">
                    Change Password
                  </h3>
                  {passwordError ? (
                    <p className="mb-3 text-sm text-error">{passwordError}</p>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                        Current Password
                      </label>
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:border-secondary outline-none"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                        New Password
                      </label>
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:border-secondary outline-none"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                        Confirm New Password
                      </label>
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 focus:border-secondary outline-none"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="submit"
                      className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-label-md text-label-md font-semibold border border-outline-variant hover:bg-surface-container-highest"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
                <hr className="border-outline-variant" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Add an extra layer of security to your account.
                    </p>
                  </div>
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={() => {
                      toast.message("Two-factor authentication is not available yet.");
                    }}
                    className="data-[state=checked]:bg-secondary"
                    aria-label="Toggle two-factor authentication"
                  />
                </div>
              </form>
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
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-surface-container-lowest border-outline-variant">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              Account deletion is not available from the app yet. Sign out instead, or contact support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-on-error hover:bg-error/90"
              onClick={() => {
                void (async () => {
                  await logout();
                  toast.message("Signed out. Account deletion is not available from the app yet.");
                  await navigate({ to: "/login", replace: true });
                })();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
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
