import { createFileRoute } from "@tanstack/react-router";
import { runSnapyQa } from "@/server/snapy-python-qa";

export const Route = createFileRoute("/api/snapy-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        try {
          const body = (await request.json()) as { text?: unknown };
          text = typeof body.text === "string" ? body.text : "";
        } catch {
          text = "";
        }
        const hit = await runSnapyQa(text);
        return Response.json(hit);
      },
    },
  },
});
