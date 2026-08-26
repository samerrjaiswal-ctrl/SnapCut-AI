import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/ai-productivity/translator")({
  component: Page,
  head: () => ({ meta: [{ title: "Translator | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Translator"
      description="Translate text and documents into multiple languages."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "AI Productivity", to: "/ai-productivity" },
        { label: "Translator" },
      ]}
      kind="text"
      actionLabel="Translate"
      processingMessage="Translating…"
    />
  );
}
