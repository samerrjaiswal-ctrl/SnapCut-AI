import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/image-ai/image-enhancer")({
  component: ImageEnhancerPage,
  head: () => ({ meta: [{ title: "Image Enhancer | SnapCut AI" }] }),
});

function ImageEnhancerPage() {
  const [level, setLevel] = useState("Standard");

  return (
    <ToolPlaceholderPage
      title="Image Enhancer"
      description="Improve image clarity, sharpness and overall quality."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Image AI", to: "/image-ai" },
        { label: "Image Enhancer" },
      ]}
      kind="image"
      actionLabel="Enhance Image"
      processingMessage="Enhancing your image…"
      optionGroups={[
        {
          label: "Enhancement Level",
          options: ["Standard", "High", "Maximum"],
          value: level,
          onChange: setLevel,
        },
      ]}
      resultSlot={({ previewUrl }) => (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 min-h-[240px]">
          <p className="font-label-md text-label-md text-on-surface mb-3">Before | After</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-container min-h-[160px] flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Before" className="w-full h-full object-contain" />
              ) : (
                <span className="font-label-sm text-label-sm text-on-surface-variant">Before</span>
              )}
            </div>
            <div className="rounded-lg bg-surface-container min-h-[160px] flex items-center justify-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">After</span>
            </div>
          </div>
        </div>
      )}
    />
  );
}
