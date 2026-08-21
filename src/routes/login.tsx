import { createFileRoute } from "@tanstack/react-router";
import { AccessScreen } from "@/components/auth/access-screen";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Log In | SnapCut AI" }],
  }),
});

function LoginPage() {
  return <AccessScreen defaultTab="login" />;
}
