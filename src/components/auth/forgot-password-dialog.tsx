import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type ForgotPasswordDialogProps = {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  onCompleted: (email: string) => void;
};

export function ForgotPasswordDialog({
  open,
  email: initialEmail,
  onOpenChange,
  onCompleted,
}: ForgotPasswordDialogProps) {
  const { sendPasswordResetCode } = useAuth();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    setEmail(initialEmail);
    setBusy(false);
    setError(null);
  }, [initialEmail, open]);

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetCode(email.trim());
      setSent(true);
      onCompleted(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full h-12 pl-11 pr-4 rounded-xl border border-outline-variant bg-surface focus:border-secondary outline-none font-body-md text-body-md";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-container-lowest border-outline-variant text-on-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline-md text-headline-md text-on-surface">
            Forgot password
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            {sent
              ? `Open the Reset password email sent to ${email}, then set a new password.`
              : "We’ll email a reset link. Open it, then choose a new password on SnapCut."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p
            className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {sent ? (
          <button
            type="button"
            className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant"
            onClick={() => onOpenChange(false)}
          >
            Back to login
          </button>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void sendLink(event)}>
            <label className="block">
              <span className="block font-label-md text-label-md text-on-surface mb-1">Email</span>
              <div className="relative">
                <Icon
                  name="mail"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 bg-primary-container text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-60 btn-glow"
            >
              {busy ? "Sending…" : "Send reset email"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
