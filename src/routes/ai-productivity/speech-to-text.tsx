import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/ai-productivity/speech-to-text")({
  component: Page,
  head: () => ({ meta: [{ title: "Speech to Text | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Speech → Text"
      description="Convert audio recordings into accurate editable text."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "AI Productivity", to: "/ai-productivity" },
        { label: "Speech → Text" },
      ]}
      kind="audio"
      actionLabel="Transcribe Audio"
      processingMessage="Transcribing audio…"
    />
  );
}
