import { createFileRoute } from "@tanstack/react-router";
import { ToolHub } from "@/components/snapcut/tool-section";
import { PRODUCTIVITY_TOOLS } from "@/data/tools";

export const Route = createFileRoute("/ai-productivity/")({
  component: AiProductivityHubPage,
  head: () => ({
    meta: [{ title: "AI Productivity | SnapCut AI" }],
  }),
});

function AiProductivityHubPage() {
  return (
    <ToolHub
      title="AI Productivity"
      description="Speed up everyday writing, translation, and document workflows with AI."
      tools={PRODUCTIVITY_TOOLS}
    />
  );
}
