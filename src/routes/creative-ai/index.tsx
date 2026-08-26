import { createFileRoute } from "@tanstack/react-router";
import { ToolHub } from "@/components/snapcut/tool-section";
import { CREATIVE_AI_TOOLS } from "@/data/tools";

export const Route = createFileRoute("/creative-ai/")({
  component: CreativeAiHubPage,
  head: () => ({
    meta: [{ title: "Creative AI | SnapCut AI" }],
  }),
});

function CreativeAiHubPage() {
  return (
    <ToolHub
      title="Creative AI"
      description="Create engaging visual content and social media assets with AI."
      tools={CREATIVE_AI_TOOLS}
    />
  );
}
