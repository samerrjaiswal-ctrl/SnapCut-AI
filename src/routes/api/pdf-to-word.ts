import { createFileRoute } from "@tanstack/react-router";
import { n8nConfig } from "@/config/n8n";
import { forwardPdfToN8n } from "@/server/forward-n8n";

export const Route = createFileRoute("/api/pdf-to-word")({
  server: {
    handlers: {
      POST: async ({ request }) => forwardPdfToN8n(request, [...n8nConfig.pdfToWordUrls]),
    },
  },
});
