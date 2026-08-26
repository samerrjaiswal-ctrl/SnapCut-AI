import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/ai-productivity/text-rewriter")({
  component: Page,
  head: () => ({ meta: [{ title: "Text Rewriter | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Text Rewriter"
      description="Rewrite text in professional, simple, formal or creative styles."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "AI Productivity", to: "/ai-productivity" },
        { label: "Text Rewriter" },
      ]}
      kind="text"
      actionLabel="Rewrite Text"
      processingMessage="Rewriting…"
    />
  );
}
