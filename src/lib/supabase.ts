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

const detectSessionInUrl =
  typeof window !== "undefined" &&
  (window.location.hash.includes("access_token") ||
    new URLSearchParams(window.location.search).has("code") ||
    new URLSearchParams(window.location.search).has("token_hash"));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl,
  },
});
