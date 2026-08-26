import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/pdf-operations/study-notes")({
  component: Page,
  head: () => ({ meta: [{ title: "PDF Study Notes | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="PDF Study Notes"
      description="Turn lengthy PDFs into structured study notes and key points."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "PDF & Documents", to: "/pdf-operations" },
        { label: "PDF Study Notes" },
      ]}
      kind="pdf"
      actionLabel="Generate Study Notes"
      processingMessage="Building study notes…"
    />
  );
}
