import { createFileRoute } from "@tanstack/react-router";
import { ToolHub } from "@/components/snapcut/tool-section";
import { PDF_TOOLS } from "@/data/tools";

export const Route = createFileRoute("/pdf-operations/")({
  component: PdfOperationsHubPage,
  head: () => ({
    meta: [{ title: "PDF Operations | SnapCut AI" }],
  }),
});

function PdfOperationsHubPage() {
  return (
    <ToolHub
      title="PDF Operations"
      description="Powerful AI-powered tools for working with PDF documents."
      tools={PDF_TOOLS}
    />
  );
}
