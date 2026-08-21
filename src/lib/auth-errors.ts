export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

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
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("security purposes") ||
    message.includes("only request this after")
  ) {
    return "Too many attempts. Please wait about 30 seconds, then log in if the account already exists.";
  }
  if (message.includes("password should be") || message.includes("weak password")) {
    return "Please choose a stronger password of at least 8 characters.";
  }

  if (import.meta.env.DEV) {
    console.error("[SnapCut] Auth error:", error);
  }

  return fallback;
}
