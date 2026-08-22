import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

export const PASSWORD_RECOVERY_KEY = "snapcut-password-recovery";

export function authParamsFromUrl() {
  if (typeof window === "undefined") {
    return { type: null as EmailOtpType | null, code: null, tokenHash: null, error: null };
  }
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = (search.get("type") || hash.get("type")) as EmailOtpType | null;
  return {
    type,
    code: search.get("code") || hash.get("code"),
    tokenHash: search.get("token_hash") || hash.get("token_hash"),
    error: (
      search.get("error_description") ||
      hash.get("error_description") ||
      search.get("error") ||
      hash.get("error") ||
      ""
    ).replace(/\+/g, " ") || null,
  };
}

export function markPasswordRecovery() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PASSWORD_RECOVERY_KEY, "1");
}

export function isPasswordRecoveryUrl() {
  const { type } = authParamsFromUrl();
  if (type === "recovery") return true;
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === "1";
}

export function capturePasswordRecoveryFromLocation() {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  const hash = window.location.hash;
  const type = new URLSearchParams(search).get("type") || new URLSearchParams(hash.replace(/^#/, "")).get("type");
  if (type === "recovery" || hash.includes("type=recovery")) {
    markPasswordRecovery();
    return true;
  }
  return false;
}

export function clearPasswordRecovery() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
}

export function redirectPasswordRecoveryIfNeeded() {
  if (typeof window === "undefined") return false;
  const { type } = authParamsFromUrl();
  const hashHasRecovery = window.location.hash.includes("type=recovery");
  if (type !== "recovery" && !hashHasRecovery) return false;
  markPasswordRecovery();
  if (window.location.pathname.startsWith("/auth/update-password")) return false;
  window.location.replace(`/auth/update-password${window.location.search}${window.location.hash}`);
  return true;
}

export async function completeAuthFromUrl(client: SupabaseClient) {
  const { error, code, tokenHash, type } = authParamsFromUrl();
  if (error) throw new Error(error);
  const existing = await client.auth.getSession();
  if (existing.data.session) return;
  if (code) {
    const exchanged = await client.auth.exchangeCodeForSession(code);
    if (exchanged.error) throw exchanged.error;
    return;
  }
  if (tokenHash && type) {
    const verified = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    if (verified.error) throw verified.error;
  }
}
