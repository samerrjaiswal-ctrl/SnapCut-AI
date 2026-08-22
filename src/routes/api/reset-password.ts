import { createFileRoute } from "@tanstack/react-router";
import { getSupabasePublicConfig } from "@/lib/supabase";

export const Route = createFileRoute("/api/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let email = "";
        try {
          const body = (await request.json()) as { email?: unknown };
          email = typeof body.email === "string" ? body.email.trim() : "";
        } catch {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }

        const { url, anonKey } = getSupabasePublicConfig();
        const origin = request.headers.get("origin");
        const redirectTo = origin ? `${origin.replace(/\/$/, "")}/auth/update-password` : undefined;
        const upstream = await fetch(`${url}/auth/v1/recover`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
            ...(redirectTo ? { "redirect-to": redirectTo } : {}),
          },
          body: JSON.stringify({ email }),
        });

        if (!upstream.ok) {
          const payload = (await upstream.json().catch(() => ({}))) as {
            error_code?: string;
            msg?: string;
            error_description?: string;
          };
          if (import.meta.env.DEV) {
            console.error("[SnapCut] recover failed", upstream.status, payload);
          }
          return Response.json(
            {
              error:
                payload.msg ||
                payload.error_description ||
                "Unable to send the reset code. Please try again.",
              code: payload.error_code,
            },
            { status: upstream.status === 429 ? 429 : 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
