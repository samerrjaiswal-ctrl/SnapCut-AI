import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/creative-ai/poster-generator")({
  component: Page,
  head: () => ({ meta: [{ title: "Poster Generator | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Poster Generator"
      description="Generate creative poster designs from simple prompts."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Creative AI", to: "/creative-ai" },
        { label: "Poster Generator" },
      ]}
      kind="image"
      uploadLabel="Upload a reference image (optional) or process with a prompt next"
      actionLabel="Generate Poster"
      processingMessage="Designing your poster…"
    />
  );
}
