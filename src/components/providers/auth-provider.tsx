import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getAuthErrorMessage } from "@/lib/auth-errors";
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
  login: (email: string, password: string) => Promise<AppSession>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ session: AppSession | null; needsConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
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

async function sessionFromUser(user: User): Promise<AppSession> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = profile?.plan === "pro" || profile?.plan === "pro_plus" ? "pro" : "free";

  return {
    userId: user.id,
    name: displayNameFromUser(user, profile?.full_name),
    email: profile?.email || user.email || "",
    plan,
    twoFactorEnabled: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function applyAuth(next: Session | null) {
      if (!next?.user) {
        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
        return;
      }
      const appSession = await sessionFromUser(next.user);
      if (!cancelled) {
        setUser(next.user);
        setSession(appSession);
      }
    }

    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      void applyAuth(data.session).finally(() => {
        if (!cancelled) setReady(true);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applyAuth(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getAuthErrorMessage(error, "Unable to sign in. Please try again."));
    if (!data.user) throw new Error("Unable to sign in. Please try again.");
    const next = await sessionFromUser(data.user);
    setUser(data.user);
    setSession(next);
    return next;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: getAuthRedirectTo(),
      },
    });
    if (error) throw new Error(getAuthErrorMessage(error, "Unable to create account. Please try again."));
    if (data.session?.user) {
      const next = await sessionFromUser(data.session.user);
      setUser(data.session.user);
      setSession(next);
      return { session: next, needsConfirmation: false };
    }
    return { session: null, needsConfirmation: true };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      throw new Error("Authentication is not configured yet.");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectTo(),
      },
    });
    if (error) {
      throw new Error(
        getAuthErrorMessage(error, "Google sign-in is not available right now. Please use email instead."),
      );
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<AppSession, "name">>) => {
      if (!user || !patch.name?.trim()) return;
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: patch.name.trim() })
        .eq("id", user.id);
      if (error) throw error;
      setSession((current) => (current ? { ...current, name: patch.name!.trim() } : current));
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
      login,
      signup,
      loginWithGoogle,
      logout,
      updateProfile,
      updatePassword,
    }),
    [session, user, ready, login, signup, loginWithGoogle, logout, updateProfile, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
