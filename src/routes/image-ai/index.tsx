import { createFileRoute } from "@tanstack/react-router";
import { ToolHub } from "@/components/snapcut/tool-section";
import { IMAGE_AI_TOOLS } from "@/data/tools";

export const Route = createFileRoute("/image-ai/")({
  component: ImageAiHubPage,
  head: () => ({
    meta: [{ title: "Image AI | SnapCut AI" }],
  }),
});

function ImageAiHubPage() {
  return (
    <ToolHub
      title="Image AI"
      description="Powerful AI tools to analyze, enhance and transform your images."
      tools={IMAGE_AI_TOOLS}
    />
  );
}
