import { createFileRoute } from "@tanstack/react-router";
import { n8nConfig } from "@/config/n8n";
import { forwardSnapyEditToN8n } from "@/server/forward-n8n";

export const Route = createFileRoute("/api/snapy-edit")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        forwardSnapyEditToN8n(request, [...n8nConfig.snapyPromptToImageUrl]),
    },
  },
});
