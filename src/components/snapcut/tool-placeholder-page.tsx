import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/snapcut/page-header";
import { ToolBreadcrumb, type Crumb } from "@/components/snapcut/tool-breadcrumb";
import { UploadArea } from "@/components/snapcut/upload-area";
import { ProcessingState, ErrorState } from "@/components/snapcut/states";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";

export type PlaceholderKind = "image" | "pdf" | "audio" | "text";

type OptionGroup = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

type ToolPlaceholderPageProps = {
  title: string;
  description: string;
  crumbs: Crumb[];
  kind?: PlaceholderKind;
  accept?: string;
  uploadLabel?: string;
  actionLabel: string;
  processingMessage?: string;
  optionGroups?: OptionGroup[];
  resultSlot?: (ctx: {
    fileName: string | null;
    previewUrl: string | null;
    resultText: string | null;
  }) => ReactNode;
};

const ACCEPT_BY_KIND: Record<PlaceholderKind, string> = {
  image: "image/png,image/jpeg,image/webp",
  pdf: "application/pdf",
  audio: "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a",
  text: ".txt,.md,.docx,text/plain",
};

export function ToolPlaceholderPage({
  title,
  description,
  crumbs,
  kind = "image",
  accept,
  uploadLabel,
  actionLabel,
  processingMessage = "Working on your file…",
  optionGroups,
  resultSlot,
}: ToolPlaceholderPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [resultText, setResultText] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const resolvedAccept = accept ?? ACCEPT_BY_KIND[kind];
  const emptyLabel =
    uploadLabel ??
    (kind === "pdf"
      ? "Upload a PDF to get started"
      : kind === "audio"
        ? "Upload an audio file to get started"
        : kind === "text"
          ? "Upload a document to get started"
          : "Upload an image to get started");

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
  }

  function onFile(next: File) {
    const okImage =
      kind === "image" &&
      (next.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(next.name));
    const okPdf =
      kind === "pdf" &&
      (next.type === "application/pdf" ||
        next.name.toLowerCase().endsWith(".pdf") ||
        next.name.toLowerCase().endsWith(".docx") ||
        next.type.includes("word"));
    const okAudio =
      kind === "audio" &&
      (next.type.startsWith("audio/") || /\.(mp3|wav|m4a)$/i.test(next.name));
    const okText =
      kind === "text" &&
      (next.type.startsWith("text/") ||
        /\.(txt|md|docx)$/i.test(next.name) ||
        next.type.includes("word"));

    if (
      (kind === "image" && !okImage) ||
      (kind === "pdf" && !okPdf) ||
      (kind === "audio" && !okAudio) ||
      (kind === "text" && !okText)
    ) {
      toast.error(
        kind === "pdf"
          ? "Please upload a PDF file."
          : kind === "audio"
            ? "Please upload an MP3, WAV, or M4A file."
            : kind === "text"
              ? "Please upload a text or document file."
              : "Please upload a PNG, JPG, or WEBP image.",
      );
      return;
    }

    clearPreview();
    setFile(next);
    setStatus("idle");
    setResultText(null);
    if (kind === "image") {
      const url = URL.createObjectURL(next);
      previewRef.current = url;
      setPreviewUrl(url);
    }
  }

  function reset() {
    clearPreview();
    setFile(null);
    setStatus("idle");
    setResultText(null);
    toast.message("Ready for another file.");
  }

  async function runAction() {
    if (!file) {
      toast.error(kind === "pdf" ? "Please select a PDF first." : "Please select a file first.");
      return;
    }
    setStatus("processing");
    await new Promise((r) => window.setTimeout(r, 900));
    setStatus("error");
    setResultText(null);
    toast.message("This tool UI is ready. Connect the n8n webhook to enable processing.");
  }

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
  }, [file]);

  return (
    <div className="p-container-margin-mobile md:p-container-margin-desktop flex flex-col gap-4 md:gap-6 min-h-0">
      <ToolBreadcrumb items={crumbs} />
      <PageHeader title={title} description={description} />

      {optionGroups?.length ? (
        <div className="flex flex-col gap-4">
          {optionGroups.map((group) => (
            <div key={group.label}>
              <p className="font-label-md text-label-md text-on-surface mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const active = group.value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => group.onChange(opt)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg font-label-md text-label-md border transition-colors",
                        active
                          ? "bg-secondary text-on-secondary border-secondary"
                          : "bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-0">
          {!file ? (
            <UploadArea
              label={emptyLabel}
              accept={resolvedAccept}
              hint={
                kind === "pdf"
                  ? "PDF files only"
                  : kind === "audio"
                    ? "MP3, WAV, or M4A"
                    : kind === "text"
                      ? "TXT, MD, or DOCX"
                      : "PNG, JPG, or WEBP"
              }
              onFile={onFile}
              className={kind !== "image" ? "min-h-[240px]" : undefined}
            />
          ) : (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-label-md text-label-md text-on-surface truncate">{fileMeta}</p>
                <button
                  type="button"
                  onClick={reset}
                  className="text-on-surface-variant hover:text-secondary"
                  aria-label="Remove file"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-full max-h-72 object-contain rounded-lg bg-surface-container"
                />
              ) : (
                <div className="min-h-[160px] rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <Icon name={kind === "pdf" ? "picture_as_pdf" : kind === "audio" ? "mic" : "description"} size={40} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0">
          {status === "processing" ? (
            <ProcessingState message={processingMessage} description="This may take a few seconds." />
          ) : status === "error" ? (
            <ErrorState
              title="Processing not connected yet"
              description="The page UI is ready. Wire this tool to your n8n webhook to enable live results."
              onRetry={() => setStatus("idle")}
            />
          ) : resultSlot ? (
            resultSlot({ fileName: file?.name ?? null, previewUrl, resultText })
          ) : (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest min-h-[240px] flex flex-col items-center justify-center gap-2 px-6 text-center text-on-surface-variant">
              <Icon name="auto_awesome" className="text-outline" size={36} />
              <p className="font-body-md text-body-md">Results will appear here after processing.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => void runAction()}
          disabled={!file || status === "processing"}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-on-primary-fixed-variant disabled:opacity-50"
        >
          <Icon name="auto_fix_high" size={18} />
          {actionLabel}
        </button>
        {file ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-outline-variant bg-surface font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
          >
            Try Another
          </button>
        ) : null}
      </div>
    </div>
  );
}
