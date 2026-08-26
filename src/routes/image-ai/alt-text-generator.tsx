import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";
import { Icon } from "@/components/snapcut/icon";

export const Route = createFileRoute("/image-ai/alt-text-generator")({
  component: AltTextGeneratorPage,
  head: () => ({ meta: [{ title: "Alt Text Generator | SnapCut AI" }] }),
});

function AltTextGeneratorPage() {
  const [language, setLanguage] = useState("English");

  return (
    <ToolPlaceholderPage
      title="Alt Text Generator"
      description="Create accessible alt text for images in English or Hindi."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Image AI", to: "/image-ai" },
        { label: "Alt Text Generator" },
      ]}
      kind="image"
      actionLabel="Generate Alt Text"
      processingMessage="Generating alt text…"
      optionGroups={[
        {
          label: "Language",
          options: ["English", "Hindi"],
          value: language,
          onChange: setLanguage,
        },
      ]}
      resultSlot={() => (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-4 min-h-[240px]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-label-md text-label-md text-on-surface">Generated Alt Text</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm"
              onClick={() => toast.message("Connect n8n to copy live alt text.")}
            >
              <Icon name="content_copy" size={16} />
              Copy Alt Text
            </button>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            &ldquo;A person working on a laptop at a desk…&rdquo;
          </p>
        </div>
      )}
    />
  );
}
