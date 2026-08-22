import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { clearPasswordRecovery } from "@/lib/auth-recovery";
import { getAuthRedirectTo, isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AppSession = {
  userId: string;
  name: string;
  email: string;
  plan: "free" | "pro";
  twoFactorEnabled: boolean;
};

type AuthContextValue = {
  session: AppSession | null;
  user: User | null;
  ready: boolean;
  mfaPending: boolean;
  passwordRecovery: boolean;
  completeMfa: () => void;
  login: (email: string, password: string) => Promise<AppSession & { mfaPending: boolean }>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ session: AppSession | null; needsConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordResetCode: (email: string) => Promise<void>;
  completePasswordRecovery: (nextPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<AppSession, "name">>) => Promise<void>;
  updatePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function displayNameFromUser(user: User, profileName?: string | null) {
  const metaName =
    typeof user.user_metadata["full_name"] === "string" ? user.user_metadata["full_name"] : "";
  return profileName?.trim() || metaName.trim() || user.email?.split("@")[0] || "Creator";
}

function fallbackSession(user: User): AppSession {
  return {
    userId: user.id,
    name: displayNameFromUser(user),
    email: user.email || "",
    plan: "free",
    twoFactorEnabled: false,
  };
}

async function sessionFromUser(user: User): Promise<AppSession> {
  try {
    const query = supabase
      .from("profiles")
      .select("full_name, email, plan")
      .eq("id", user.id)
      .maybeSingle();
    const timedOut = new Promise<{ data: null }>((resolve) => {
      setTimeout(() => resolve({ data: null }), 2000);
    });
    const { data: profile } = await Promise.race([query, timedOut]);
    if (!profile) return fallbackSession(user);
    const plan = profile.plan === "pro" || profile.plan === "pro_plus" ? "pro" : "free";
    return {
      userId: user.id,
      name: displayNameFromUser(user, profile.full_name),
      email: profile.email || user.email || "",
      plan,
      twoFactorEnabled: false,
    };
  } catch {
    return fallbackSession(user);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const holdGuestRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function applyAuth(next: Session | null) {
      if (holdGuestRef.current) return;
      if (!next?.user) {
        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
        return;
      }
      const appSession = await sessionFromUser(next.user);
      if (holdGuestRef.current || cancelled) return;
      setUser(next.user);
      setSession(appSession);
    }

    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    const readyTimer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 4000);

    void supabase.auth
      .getSession()
      .then(({ data }) => applyAuth(data.session))
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(readyTimer);
        if (!cancelled) setReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applyAuth(nextSession);
    });

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(getAuthErrorMessage(error, "Unable to sign in. Please try again."));
    if (!data.user) throw new Error("Unable to sign in. Please try again.");
    const next = await sessionFromUser(data.user);
    setUser(data.user);
    setSession(next);
    return { ...next, mfaPending: false };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const redirectTo = getAuthRedirectTo();
    holdGuestRef.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo
          ? { data: { full_name: name }, emailRedirectTo: redirectTo }
          : { data: { full_name: name } },
      });
      if (error) throw new Error(getAuthErrorMessage(error, "Unable to create account. Please try again."));
      const alreadyRegistered =
        Boolean(data.user) && Array.isArray(data.user.identities) && data.user.identities.length === 0;
      if (alreadyRegistered) {
        throw new Error("An account with this email already exists. Try logging in.");
      }
      if (data.session) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      return {
        session: null,
        needsConfirmation: Boolean(data.user) && !data.session,
      };
    } finally {
      holdGuestRef.current = false;
    }
  }, []);

  const sendPasswordResetCode = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      throw new Error(
        getAuthErrorMessage(
          { message: payload.error, code: payload.code, status: response.status },
          "Unable to send the reset email. Please try again.",
        ),
      );
    }
  }, []);

  const completePasswordRecovery = useCallback(async (nextPassword: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) {
      throw new Error(getAuthErrorMessage(error, "Unable to update password. Please try again."));
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    clearPasswordRecovery();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      throw new Error(
        getAuthErrorMessage(error, "Google sign-in is not available right now. Please use email instead."),
      );
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Session can already be gone after account deletion.
    }
    setUser(null);
    setSession(null);
  }, []);

  const completeMfa = useCallback(() => undefined, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<AppSession, "name">>) => {
      const nextName = patch.name?.trim();
      if (!user || !nextName) {
        throw new Error("Enter a name before saving.");
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: nextName, updated_at: now })
        .eq("id", user.id)
        .select("full_name")
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? "",
          full_name: nextName,
          updated_at: now,
        });
        if (upsertError) throw upsertError;
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: nextName },
      });
      if (metaError) throw metaError;
      setSession((current) => (current ? { ...current, name: nextName } : current));
    },
    [user],
  );

  const updatePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      if (!session?.email) throw new Error("You need to be signed in to change your password.");
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw new Error(getAuthErrorMessage(error, "Unable to update password. Please try again."));
    },
    [session?.email],
  );

  const value = useMemo(
    () => ({
      session,
      user,
      ready,
      mfaPending: false,
      passwordRecovery: false,
      completeMfa,
      login,
      signup,
      sendPasswordResetCode,
      completePasswordRecovery,
      loginWithGoogle,
      logout,
      updateProfile,
      updatePassword,
    }),
    [
      session,
      user,
      ready,
      completeMfa,
      login,
      signup,
      sendPasswordResetCode,
      completePasswordRecovery,
      loginWithGoogle,
      logout,
      updateProfile,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
