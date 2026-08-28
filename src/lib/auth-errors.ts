export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const authError =
    error && typeof error === "object"
      ? (error as { message?: string; code?: string; status?: number })
      : {};
  const message = typeof authError.message === "string" ? authError.message.toLowerCase() : "";
  const code = typeof authError.code === "string" ? authError.code.toLowerCase() : "";

  if (
    message.includes("abort") ||
    message.includes("aborted") ||
    message.includes("taking too long") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    code === "authretryablefetcherror"
  ) {
    return "Authentication is taking too long. Wait a minute and try again.";
  }
  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox and spam folder.";
  }
  if (message.includes("user already registered") || message.includes("already registered")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (
    code === "unexpected_failure" ||
    authError.status === 500 ||
    message.includes("too many colons") ||
    message.includes("error sending recovery") ||
    (message.includes("redirect") && message.includes("not allowed"))
  ) {
    return "Supabase custom SMTP is pointing at localhost. In Project Settings → Authentication, turn Custom SMTP OFF and save, then try Send code again.";
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("security purposes") ||
    message.includes("only request this after")
  ) {
    return "Too many attempts. Please wait about 30 seconds, then try Send code again.";
  }
  if (message.includes("token has expired") || message.includes("otp_expired")) {
    return "That code expired. Request a new one from Forgot password.";
  }
  if (
    (message.includes("invalid") && (message.includes("otp") || message.includes("token"))) ||
    message.includes("email otp")
  ) {
    return "That email code did not match. Use the newest 6-digit code from your inbox.";
  }
  if (
    message.includes("invalid totp") ||
    message.includes("mfa_verification_failed") ||
    message.includes("invalid nonce")
  ) {
    return "That 6-digit code did not match. Use the newest code from the app — not the secret key.";
  }
  if (message.includes("reauthentication") || message.includes("reauthenticate") || message.includes("nonce")) {
    return "Enter a fresh 6-digit authenticator code to confirm this password change.";
  }
  if (
    message.includes("same password") ||
    message.includes("should be different") ||
    message.includes("different from the old")
  ) {
    return "New password must be different from the current password.";
  }

  if (import.meta.env.DEV) {
    console.error("[SnapCut] Auth error:", error);
  }

  return fallback;
}
