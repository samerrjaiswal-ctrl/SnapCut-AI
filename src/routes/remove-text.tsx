import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/snapcut/page-header";
import { UploadArea } from "@/components/snapcut/upload-area";
import { ProcessingState, ErrorState } from "@/components/snapcut/states";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getUserFacingErrorMessage,
  removeTextFromImage,
  validateImageFile,
} from "@/services/image-processing-service";
import { saveCompletedOperation } from "@/services/history-service";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { ToolActions } from "@/components/snapcut/tool-actions";

export const Route = createFileRoute("/remove-text")({
  component: RemoveTextPage,
  head: () => ({
    meta: [{ title: "Remove Text | SnapCut AI" }],
  }),
});

function RemoveTextPage() {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Please try again.");
  const isProcessing = status === "processing";
  const imageUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  function resetWorkspace() {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    imageUrlRef.current = null;
    resultUrlRef.current = null;
    setFile(null);
    setImageUrl(null);
    setResultUrl(null);
    setFileName("image");
    setZoom(1);
    setStatus("idle");
    setErrorMessage("Please try again.");
    toast.message("Started a new text removal.");
  }

  function onFile(nextFile: File) {
    try {
      validateImageFile(nextFile);
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Please upload a JPEG, PNG, or WebP image.");
      toast.error(message);
      return;
    }

    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

    const nextUrl = URL.createObjectURL(nextFile);
    imageUrlRef.current = nextUrl;
    resultUrlRef.current = null;
    setFile(nextFile);
    setImageUrl(nextUrl);
    setFileName(nextFile.name);
    setResultUrl(null);
    setStatus("idle");
  }

  async function processImage() {
    if (isProcessing) return;

    if (!file) {
      toast.error("Please select an image first.");
      return;
    }

    setStatus("processing");
    try {
      const blob = await removeTextFromImage(file);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const nextResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextResultUrl;
      setResultUrl(nextResultUrl);
      setStatus("ready");
      if (session) {
        try {
          await saveCompletedOperation({
            userId: session.userId,
            operationType: "remove_text",
            originalFile: file,
            resultBlob: blob,
          });
          toast.success("Saved to History.");
        } catch (historyError) {
          if (import.meta.env.DEV) console.error(historyError);
          toast.error(
            historyError instanceof Error
              ? `Result is ready, but saving to History failed: ${historyError.message}`
              : "Result is ready, but saving to History failed.",
          );
        }
      }
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Text removal failed. Please try again.");
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }

  function downloadResult() {
    if (!resultUrl) return;
    const baseName = fileName.replace(/\.[^.]+$/, "") || "image";
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `cleaned-${baseName}.png`;
    a.click();
    toast.success("Download started.");
  }

  return (
    <>
      <div className="px-container-margin-mobile md:px-container-margin-desktop py-6 md:py-12">
          <div className="w-full flex flex-col gap-4 md:gap-6 md:flex-row md:items-end md:justify-between min-w-0">
            <PageHeader
              title="Remove Text"
              description="Erase unwanted text or watermarks while preserving the original background."
            />
            <ToolActions
              actionLabel="Remove Text"
              actionIcon="ink_eraser"
              actionDisabled={!file}
              downloadDisabled={status !== "ready" || !resultUrl}
              busy={isProcessing}
              onNew={resetWorkspace}
              onAction={() => void processImage()}
              onDownload={downloadResult}
            />
          </div>
      </div>

      <div className="flex-1 w-full px-container-margin-mobile md:px-container-margin-desktop pb-8">
        <div className="w-full h-full flex flex-col lg:flex-row gap-gutter">
          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[240px] sm:min-h-[400px] min-w-0">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon name="image" size={18} /> Original Image
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(1))))}
                  title="Zoom in"
                  disabled={isProcessing}
                >
                  <Icon name="zoom_in" size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                  title="Zoom out"
                  disabled={isProcessing}
                >
                  <Icon name="zoom_out" size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new"
                  disabled={isProcessing}
                >
                  <Icon name="upload" size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="sr-only"
                  disabled={isProcessing}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    e.target.value = "";
                    if (selected) onFile(selected);
                  }}
                />
              </div>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex items-center justify-center bg-surface-container-low overflow-hidden">
              {!imageUrl ? (
                <UploadArea
                  onFile={onFile}
                  accept="image/jpeg,image/png,image/webp"
                  label="Upload an image with text to remove"
                />
              ) : (
                <img
                  src={imageUrl}
                  alt="Original upload"
                  className="max-w-full max-h-[min(480px,55dvh)] object-contain rounded border border-outline-variant"
                  style={{ transform: `scale(${zoom})` }}
                />
              )}
            </div>
          </section>

          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[240px] sm:min-h-[400px] min-w-0">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon name="ink_eraser" size={18} /> Cleaned Result
              </span>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex items-center justify-center bg-surface">
              {status === "processing" ? (
                <ProcessingState
                  message="Reconstructing the background…"
                  description="Keep this tab open while the result is prepared."
                  className="w-full"
                />
              ) : status === "error" ? (
                <ErrorState description={errorMessage} onRetry={() => void processImage()} />
              ) : resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Cleaned result preview"
                  className="max-w-full max-h-[min(480px,55dvh)] object-contain rounded border border-outline-variant"
                />
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-sm">
                  Upload an image, then press Remove Text to generate the cleaned result.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      {isProcessing ? (
        <OverlayLoader
          message="Removing text…"
          description="This usually takes a few seconds."
        />
      ) : null}
    </>
  );
}
