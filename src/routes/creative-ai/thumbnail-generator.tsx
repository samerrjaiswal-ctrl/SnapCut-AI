import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/creative-ai/thumbnail-generator")({
  component: Page,
  head: () => ({ meta: [{ title: "Thumbnail Generator | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Thumbnail Generator"
      description="Create engaging thumbnails for videos and social content."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Creative AI", to: "/creative-ai" },
        { label: "Thumbnail Generator" },
      ]}
      kind="image"
      actionLabel="Generate Thumbnail"
      processingMessage="Creating thumbnail…"
    />
  );
}
