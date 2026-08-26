import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/pdf-operations/invoice-extractor")({
  component: Page,
  head: () => ({ meta: [{ title: "Invoice Extractor | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Invoice Extractor"
      description="Extract structured invoice information automatically using AI."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "PDF & Documents", to: "/pdf-operations" },
        { label: "Invoice Extractor" },
      ]}
      kind="pdf"
      actionLabel="Extract Invoice Data"
      processingMessage="Extracting invoice fields…"
    />
  );
}
