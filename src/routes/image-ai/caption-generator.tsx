import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";
import { Icon } from "@/components/snapcut/icon";

export const Route = createFileRoute("/image-ai/caption-generator")({
  component: CaptionGeneratorPage,
  head: () => ({ meta: [{ title: "Caption Generator | SnapCut AI" }] }),
});

function CaptionGeneratorPage() {
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");

  return (
    <ToolPlaceholderPage
      title="Caption Generator"
      description="Generate platform-ready captions and hashtags from your images."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Image AI", to: "/image-ai" },
        { label: "Caption Generator" },
      ]}
      kind="image"
      actionLabel="Generate Caption"
      processingMessage="Generating caption…"
      optionGroups={[
        {
          label: "Platform",
          options: ["Instagram", "LinkedIn", "Facebook", "X"],
          value: platform,
          onChange: setPlatform,
        },
        {
          label: "Tone",
          options: ["Professional", "Casual", "Creative", "Funny"],
          value: tone,
          onChange: setTone,
        },
        {
          label: "Language",
          options: ["English", "Hindi"],
          value: language,
          onChange: setLanguage,
        },
      ]}
      resultSlot={() => (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-4 min-h-[240px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-label-md text-label-md text-on-surface">Generated Caption</h3>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm"
                onClick={() => toast.message("Connect n8n to copy live captions.")}
              >
                <Icon name="content_copy" size={16} />
                Copy
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Your generated caption will appear here after processing.
            </p>
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface mb-2">Hashtags</h3>
            <p className="font-body-md text-body-md text-secondary">#AI #SnapCut #Technology</p>
          </div>
        </div>
      )}
    />
  );
}
