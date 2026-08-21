import { createFileRoute } from "@tanstack/react-router";
import { AccessScreen } from "@/components/auth/access-screen";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [{ title: "Sign Up | SnapCut AI" }],
  }),
});

function SignupPage() {
  return <AccessScreen defaultTab="signup" />;
}
