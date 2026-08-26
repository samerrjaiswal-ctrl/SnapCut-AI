import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/pdf-operations/manage")({
  component: Page,
  head: () => ({ meta: [{ title: "Compress & Split | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Compress & Split"
      description="Compress, split and manage PDF documents with powerful tools."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "PDF & Documents", to: "/pdf-operations" },
        { label: "Compress & Split" },
      ]}
      kind="pdf"
      actionLabel="Manage PDF"
      processingMessage="Processing PDF…"
    />
  );
}
