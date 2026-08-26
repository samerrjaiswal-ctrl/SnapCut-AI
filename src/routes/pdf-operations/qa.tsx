import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/pdf-operations/qa")({
  component: Page,
  head: () => ({ meta: [{ title: "PDF Q&A | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="PDF Q&A"
      description="Ask questions and get intelligent answers directly from your PDF documents."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "PDF & Documents", to: "/pdf-operations" },
        { label: "PDF Q&A" },
      ]}
      kind="pdf"
      actionLabel="Ask Question"
      processingMessage="Reading your PDF…"
    />
  );
}
