import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://fbaropuqppterxawlrqf.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYXJvcHVxcHB0ZXJ4YXdscnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTY3OTcsImV4cCI6MjEwMjY5Mjc5N30.g2EvZk0pjFMM7QApHv8q7ngdja-kXmReun701sUfhpA";

function readPublicEnv(viteValue: string | undefined, processKey: string, fallback: string) {
  const fromVite = (viteValue ?? "").trim();
  if (fromVite) return fromVite;
  const fromProcess =
    typeof process !== "undefined" ? String(process.env[processKey] ?? "").trim() : "";
  return fromProcess || fallback;
}

const supabaseUrl = readPublicEnv(
  import.meta.env.VITE_SUPABASE_URL,
  "VITE_SUPABASE_URL",
  FALLBACK_SUPABASE_URL,
);
const supabaseAnonKey = readPublicEnv(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  "VITE_SUPABASE_ANON_KEY",
  FALLBACK_SUPABASE_ANON_KEY,
);

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabasePublicConfig() {
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

export function getAuthRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/login`;
}

/** Drop persisted GoTrue keys so a hung /logout call cannot keep the user signed in. */
export function clearPersistedSupabaseSession() {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("sb-") && key.includes("auth-token")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage can be blocked in private mode.
  }
}

const AUTH_FETCH_TIMEOUT_MS = 8000;

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Abort hung GoTrue calls so login/signup/logout cannot spin forever. */
export function fetchWithAuthTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const url = requestUrl(input);
  if (!url.includes("/auth/v1/")) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  const parent = init?.signal;
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const detectSessionInUrl =
  typeof window !== "undefined" &&
  (window.location.hash.includes("access_token") ||
    new URLSearchParams(window.location.search).has("code") ||
    new URLSearchParams(window.location.search).has("token_hash"));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithAuthTimeout },
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl,
  },
});
