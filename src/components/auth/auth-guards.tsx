import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";

function AuthSplash({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Icon name="progress_activity" className="text-secondary animate-spin" />
        <p className="font-label-md text-label-md text-on-surface">{message}</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      void navigate({ to: "/login", replace: true, viewTransition: true });
    }
  }, [ready, session, navigate]);

  if (session) return children;
  if (!ready) return <AuthSplash message="Checking your session…" />;
  return <AuthSplash message="Taking you to log in…" />;
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && session) {
      void navigate({ to: "/", replace: true, viewTransition: true });
    }
  }, [ready, session, navigate]);

  if (session) return <AuthSplash message="Taking you home…" />;
  return children;
}
