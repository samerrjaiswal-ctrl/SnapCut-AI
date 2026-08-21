import { createFileRoute, redirect } from "@tanstack/react-router";

type AccessSearch = {
  mode?: "login" | "signup";
};

export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>): AccessSearch => ({
    ...(search["mode"] === "signup" ? { mode: "signup" } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: search["mode"] === "signup" ? "/signup" : "/login",
    });
  },
  component: () => null,
});
