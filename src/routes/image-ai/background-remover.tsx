import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/image-ai/background-remover")({
  component: BackgroundRemoverPage,
  head: () => ({ meta: [{ title: "Background Remover | SnapCut AI" }] }),
});

function BackgroundRemoverPage() {
  return (
    <ToolPlaceholderPage
      title="Background Remover"
      description="Remove image backgrounds automatically with AI."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Image AI", to: "/image-ai" },
        { label: "Background Remover" },
      ]}
      kind="image"
      actionLabel="Remove Background"
      processingMessage="Removing background…"
    />
  );
}
