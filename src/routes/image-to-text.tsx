import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/snapcut/page-header";
import { UploadArea } from "@/components/snapcut/upload-area";
import { ProcessingState, ErrorState } from "@/components/snapcut/states";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import {
  extractTextFromImage,
  getUserFacingErrorMessage,
  validateImageFile,
} from "@/services/image-processing-service";
import { saveCompletedOperation } from "@/services/history-service";

export const Route = createFileRoute("/image-to-text")({
  component: ImageToTextPage,
  head: () => ({
    meta: [{ title: "Image to Text | SnapCut AI" }],
  }),
});

function ImageToTextPage() {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("document");
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("Please try again.");
  const isProcessing = status === "processing";
  const imageUrlRef = useRef<string | null>(null);

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  function onFile(nextFile: File) {
    try {
      validateImageFile(nextFile);
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Please upload a JPEG, PNG, or WebP image.");
      toast.error(message);
      return;
    }

    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    const nextUrl = URL.createObjectURL(nextFile);
    imageUrlRef.current = nextUrl;
    setFile(nextFile);
    setImageUrl(nextUrl);
    setFileName(nextFile.name);
    setStatus("idle");
    setText("");
  }

  async function processImage() {
    if (isProcessing) return;

    if (!file) {
      toast.error("Please select an image first.");
      return;
    }

    setStatus("processing");
    try {
      const extracted = await extractTextFromImage(file);
      setText(extracted);
      setStatus("ready");
      if (!extracted.trim()) {
        toast.message("No text was found in that image.");
      }
      if (session?.userId) {
        try {
          await saveCompletedOperation({
            userId: session.userId,
            operationType: "extract_text",
            originalFile: file,
            extractedText: extracted,
          });
        } catch (historyError) {
          if (import.meta.env.DEV) console.error(historyError);
          toast.message("Text is ready, but saving to history failed.");
        }
      }
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Text extraction failed. Please try again.");
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(text);
    toast.success("Copied extracted text.");
  }

  function downloadText() {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout contentClassName="flex flex-col min-h-screen">
      <div className="px-container-margin-mobile md:px-container-margin-desktop py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Image to Text"
            description="Extract text from any image with high precision OCR technology."
          />
        </div>
      </div>

      <div className="flex-1 px-container-margin-mobile md:px-container-margin-desktop pb-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-gutter">
          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon name="image" size={18} /> Original Document
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  title="Zoom in"
                  disabled={isProcessing}
                  onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(1))))}
                >
                  <Icon name="zoom_in" size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  title="Zoom out"
                  disabled={isProcessing}
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                >
                  <Icon name="zoom_out" size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                  title="Upload new"
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
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
            <div className="flex-1 p-6 flex items-center justify-center bg-surface-container-low overflow-hidden relative">
              {!imageUrl ? (
                <UploadArea
                  onFile={onFile}
                  accept="image/jpeg,image/png,image/webp"
                  label="Upload a document or screenshot"
                />
              ) : status === "processing" ? (
                <ProcessingState message="Extracting text from the image…" className="w-full" />
              ) : status === "error" ? (
                <ErrorState description={errorMessage} onRetry={processImage} />
              ) : (
                <img
                  src={imageUrl}
                  alt="Uploaded document preview"
                  className="max-w-full max-h-[480px] object-contain rounded border border-outline-variant origin-center"
                  style={{ transform: `scale(${zoom})` }}
                />
              )}
            </div>
            {imageUrl && !isProcessing ? (
              <div className="p-4 border-t border-outline-variant bg-surface-bright">
                <button
                  type="button"
                  onClick={processImage}
                  disabled={!file}
                  className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-50"
                >
                  Extract Text
                </button>
              </div>
            ) : null}
          </section>

          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon name="notes" size={18} /> Extracted Text
              </span>
            </div>
            <div className="flex-1 p-6">
              {status === "ready" ? (
                <textarea
                  className="w-full h-full min-h-[240px] resize-none border-none focus:ring-0 font-body-md text-body-md text-on-surface bg-transparent outline-none whitespace-pre-wrap"
                  spellCheck={false}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Extracted text"
                />
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Upload an image and click Extract Text to see the extracted text here.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-bright flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="font-label-sm text-label-sm text-on-surface-variant flex gap-4">
                <span>Words: {words}</span>
                <span>Chars: {chars}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={status !== "ready"}
                  onClick={downloadText}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#F1F5F9] text-primary hover:bg-[#E2E8F0] px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-50"
                >
                  <Icon name="download" size={18} />
                  Download
                </button>
                <button
                  type="button"
                  disabled={status !== "ready"}
                  onClick={copyText}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary text-on-secondary hover:opacity-90 px-4 py-2 rounded-lg font-label-md text-label-md disabled:opacity-50"
                >
                  <Icon name="content_copy" size={18} />
                  Copy Text
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
