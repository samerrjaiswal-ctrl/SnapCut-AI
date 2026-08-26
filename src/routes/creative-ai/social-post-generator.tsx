import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/creative-ai/social-post-generator")({
  component: Page,
  head: () => ({ meta: [{ title: "Social Post Generator | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Social Post Generator"
      description="Generate social media posts, captions and hashtags with AI."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Creative AI", to: "/creative-ai" },
        { label: "Social Post Generator" },
      ]}
      kind="image"
      actionLabel="Generate Social Post"
      processingMessage="Writing your post…"
    />
  );
}
