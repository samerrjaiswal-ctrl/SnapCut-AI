import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { HISTORY_BUCKET } from "@/services/history-service";

async function listStoragePaths(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(HISTORY_BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
  });
  if (error || !data?.length) return [];

  const files: string[] = [];
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id) {
      files.push(...(await listStoragePaths(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function removeOwnHistoryFiles(userId: string) {
  const paths = await listStoragePaths(userId);
  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    const { error } = await supabase.storage.from(HISTORY_BUCKET).remove(chunk);
    if (error && import.meta.env.DEV) console.error(error);
  }
}

export async function deleteOwnAccount() {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = data.user?.id;
  if (!userId) throw new Error("You need to be signed in to delete this account.");

  await removeOwnHistoryFiles(userId);

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    throw new Error(error.message || "Unable to delete this account.");
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Auth user is already gone, so sign-out can fail. Local logout still runs in Settings.
  }
}

export async function verifyEmailPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return;

  const message = error.message.toLowerCase();
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (
    code.includes("mfa") ||
    code.includes("aal") ||
    message.includes("mfa") ||
    message.includes("aal") ||
    message.includes("second factor") ||
    message.includes("additional authentication")
  ) {
    return;
  }
  throw new Error("Current password is incorrect.");
}

export async function saveNewPassword(nextPassword: string, nonce?: string) {
  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
    ...(nonce ? { nonce } : {}),
  });
  if (error) {
    throw new Error(getAuthErrorMessage(error, "Unable to update password. Please try again."));
  }
}

export async function resendSignupEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message || "Unable to resend the confirmation email.");
}

export async function listVerifiedMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp.filter((factor) => factor.status === "verified");
}

export async function getPendingTotpFactorId() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const pending = (data.all ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status !== "verified",
  );
  return pending[pending.length - 1]?.id ?? null;
}

function totpMessage(error: unknown, fallback: string) {
  const message =
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid") &&
    (lower.includes("totp") || lower.includes("code") || lower.includes("expired"))
  ) {
    return "That 6-digit code did not match. Use the newest code from the app — not the secret key.";
  }
  if (lower.includes("friendly name") || lower.includes("already exists")) {
    return "Authenticator setup is already in progress. Refresh the page, then try again.";
  }
  return message || fallback;
}

export function normalizeTotpCode(input: string) {
  return input.replace(/\D/g, "").slice(0, 6);
}

function qrImageFromTotp(totp: { qr_code: string; uri: string }) {
  if (totp.uri) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(totp.uri)}`;
  }
  if (totp.qr_code.startsWith("data:")) return totp.qr_code;
  if (totp.qr_code.includes("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(totp.qr_code)}`;
  }
  return totp.qr_code;
}

async function unenrollUnverifiedTotp() {
  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error) throw listed.error;
  const pending = (listed.data.all ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status !== "verified",
  );
  for (const factor of pending) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
}

export async function enrollTotp(friendlyName = "SnapCut AI") {
  await unenrollUnverifiedTotp();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${friendlyName} ${Date.now().toString(36)}`,
    issuer: "SnapCut AI",
  });
  if (error) throw new Error(totpMessage(error, "Unable to start authenticator setup."));
  if (!data.totp) throw new Error("Authenticator setup is not available.");
  return {
    id: data.id,
    qr: qrImageFromTotp(data.totp),
    secret: data.totp.secret.replace(/\s/g, "").toUpperCase(),
  };
}

export async function verifyTotpFactor(factorId: string, code: string) {
  const digits = normalizeTotpCode(code);
  if (digits.length !== 6) {
    throw new Error("Enter the 6-digit code from your authenticator app, not the secret key.");
  }
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) {
    throw new Error(totpMessage(challenge.error, "Unable to check that code. Try again."));
  }
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: digits,
  });
  if (verified.error) {
    throw new Error(totpMessage(verified.error, "That code did not match. Try the newest 6-digit code."));
  }
  const payload = verified.data as {
    session?: { access_token: string; refresh_token: string };
    access_token?: string;
    refresh_token?: string;
  };
  const accessToken = payload.session?.access_token ?? payload.access_token;
  const refreshToken = payload.session?.refresh_token ?? payload.refresh_token;
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}

export async function unenrollTotp(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function needsMfaChallenge() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

export async function verifyLoginTotp(code: string) {
  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error) throw listed.error;
  const factor = listed.data.totp[0];
  if (!factor) throw new Error("No authenticator is set up on this account.");
  await verifyTotpFactor(factor.id, code);
}
