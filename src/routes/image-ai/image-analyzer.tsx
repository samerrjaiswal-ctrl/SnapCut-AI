import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";
import { Icon } from "@/components/snapcut/icon";

export const Route = createFileRoute("/image-ai/image-analyzer")({
  component: ImageAnalyzerPage,
  head: () => ({ meta: [{ title: "Image Analyzer | SnapCut AI" }] }),
});

function ImageAnalyzerPage() {
  return (
    <ToolPlaceholderPage
      title="Image Analyzer"
      description="Understand your images with AI-powered visual analysis."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Image AI", to: "/image-ai" },
        { label: "Image Analyzer" },
      ]}
      kind="image"
      actionLabel="Analyze Image"
      processingMessage="Analyzing your image…"
      resultSlot={() => (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-4 min-h-[240px]">
          <div>
            <h3 className="font-label-md text-label-md text-on-surface mb-1">Image Description</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Upload and analyze an image to see a description here.
            </p>
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface mb-2">Detected Objects</h3>
            <div className="flex flex-wrap gap-2">
              {["Laptop", "Person", "Desk", "Coffee", "Scene"].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant border border-outline-variant"
                >
                  <Icon name="sell" size={14} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface mb-1">Detected Text</h3>
            <div className="rounded-lg border border-outline-variant bg-surface p-3 font-body-md text-body-md text-on-surface-variant">
              Any text found in the image will appear here.
            </div>
          </div>
        </div>
      )}
    />
  );
}
