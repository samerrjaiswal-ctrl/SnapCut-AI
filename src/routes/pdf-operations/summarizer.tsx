import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/pdf-operations/summarizer")({
  component: Page,
  head: () => ({ meta: [{ title: "PDF Summarizer | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="PDF Summarizer"
      description="Generate concise AI-powered summaries from your PDF documents."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "PDF & Documents", to: "/pdf-operations" },
        { label: "PDF Summarizer" },
      ]}
      kind="pdf"
      actionLabel="Summarize PDF"
      processingMessage="Summarizing your PDF…"
    />
  );
}
