import { createFileRoute } from "@tanstack/react-router";
import { n8nConfig } from "@/config/n8n";
import { forwardImageToN8n } from "@/server/forward-n8n";

export const Route = createFileRoute("/api/extract-text")({
  server: {
    handlers: {
      POST: async ({ request }) => forwardImageToN8n(request, [...n8nConfig.textExtractorUrls]),
    },
  },
});
