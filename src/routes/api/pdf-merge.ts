import { createFileRoute } from "@tanstack/react-router";
import { n8nConfig } from "@/config/n8n";
import { forwardPdfMergeToN8n } from "@/server/forward-n8n";

export const Route = createFileRoute("/api/pdf-merge")({
  server: {
    handlers: {
      POST: async ({ request }) => forwardPdfMergeToN8n(request, [...n8nConfig.pdfMergeUrls]),
    },
  },
});
