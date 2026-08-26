import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/snapcut/icon";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { cn } from "@/lib/utils";

export type PdfMode = "word" | "pptx" | "merger";

type PdfOperationsViewProps = {
  initialMode?: PdfMode;
};

export function PdfOperationsView({ initialMode = "word" }: PdfOperationsViewProps) {
  const [mode, setMode] = useState<PdfMode>(initialMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Single file state (Word / PPTX)
  const [file, setFile] = useState<File | null>(null);

  // Multi file state (PDF Merger)
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);

  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("Please try again.");
  const navigate = useNavigate();

  const isProcessing = status === "processing";
  const isWord = mode === "word";
  const isPptx = mode === "pptx";
  const isMerger = mode === "merger";

  function handleModeChange(newMode: PdfMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setStatus("idle");
    setResultUrl(null);
    const targetRoute =
      newMode === "word"
        ? "/pdf-to-word"
        : newMode === "pptx"
          ? "/pdf-to-pptx"
          : "/pdf-merger";
    void navigate({ to: targetRoute, replace: true });
  }

  function resetWorkspace() {
    setFile(null);
    setMergeFiles([]);
    setStatus("idle");
    setResultUrl(null);
    setErrorMessage("Please try again.");
    toast.message("Started a new operation.");
  }

  // Single file handler
  function onSingleFile(nextFile: File) {
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file.");
      return;
    }
    setFile(nextFile);
    setStatus("idle");
    setResultUrl(null);
  }

  // Multi file handler (PDF Merger)
  function onMultiFiles(newFiles: FileList | File[]) {
    const validPdfs: File[] = [];
    Array.from(newFiles).forEach((f) => {
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        validPdfs.push(f);
      } else {
        toast.error(`"${f.name}" is not a PDF file.`);
      }
    });

    if (validPdfs.length > 0) {
      setMergeFiles((prev) => [...prev, ...validPdfs]);
      setStatus("idle");
      setResultUrl(null);
      toast.success(`Added ${validPdfs.length} PDF file(s).`);
    }
  }

  function removeMergeFile(index: number) {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
    setStatus("idle");
    setResultUrl(null);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (isMerger) {
      if (event.dataTransfer.files?.length) {
        onMultiFiles(event.dataTransfer.files);
      }
    } else {
      const droppedFile = event.dataTransfer.files?.[0];
      if (droppedFile) onSingleFile(droppedFile);
    }
  }

  async function processOperation() {
    if (isProcessing) return;

    if (isMerger) {
      if (mergeFiles.length < 2) {
        toast.error("Please add at least 2 PDF files to merge.");
        return;
      }
    } else {
      if (!file) {
        toast.error("Please select a PDF file first.");
        return;
      }
    }

    setStatus("processing");
    try {
      const formData = new FormData();

      if (isMerger) {
        mergeFiles.forEach((f, idx) => {
          formData.append(`file_${idx + 1}`, f);
        });
      } else {
        if (file) {
          formData.append("file", file);
          formData.append("data", file);
        }
      }

      const endpoint = isWord
        ? "/api/pdf-to-word"
        : isPptx
          ? "/api/pdf-to-pptx"
          : "/api/merge-pdf";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errDetail = "";
        try {
          const errJson = await response.json();
          errDetail = errJson.error || errJson.message || "";
        } catch {}
        throw new Error(
          errDetail ||
            `Processing service returned status ${response.status}. Make sure your n8n workflow is active.`,
        );
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();

      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json.success === false) {
          throw new Error(json.error || "Operation failed on n8n workflow.");
        }
        if (json.url || json.downloadUrl) {
          setResultUrl(json.url || json.downloadUrl);
        } else if (json.data && typeof json.data === "string" && json.data.startsWith("data:")) {
          setResultUrl(json.data);
        } else {
          const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
          setResultUrl(URL.createObjectURL(blob));
        }
      } else {
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error("No output file was returned by the n8n workflow.");
        }
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
      }

      setStatus("ready");
      const successMsg = isWord
        ? "PDF converted to Word successfully!"
        : isPptx
          ? "PDF converted to PPTX successfully!"
          : "PDFs merged successfully!";
      toast.success(successMsg);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Operation failed. Please check your n8n workflow.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }

  function downloadResult() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    let ext = "pdf";
    let filename = "merged-document.pdf";

    if (isWord) {
      ext = "docx";
      filename = `${file?.name?.replace(/\.pdf$/i, "") || "document"}.${ext}`;
    } else if (isPptx) {
      ext = "pptx";
      filename = `${file?.name?.replace(/\.pdf$/i, "") || "document"}.${ext}`;
    } else {
      filename = `merged_${mergeFiles[0]?.name?.replace(/\.pdf$/i, "") || "document"}.pdf`;
    }

    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download started.");
  }

  const buttonClass =
    "inline-flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-11 h-10 px-3 sm:px-4 rounded-lg font-label-md text-label-md disabled:opacity-45 disabled:pointer-events-none";

  const totalMergeSize = mergeFiles.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <>
      <div className="px-container-margin-mobile md:px-container-margin-desktop py-6 md:py-12">
        <div className="w-full flex flex-col gap-4 md:gap-6 md:flex-row md:items-end md:justify-between min-w-0">
          <header className="mb-0 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold tracking-tight">
                {isWord ? "PDF to Word" : isPptx ? "PDF to PPTX" : "PDF Merger"}
              </h1>

              {/* Normal Mode Buttons Beside Title */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("word")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all",
                    isWord
                      ? "bg-secondary text-on-secondary shadow-md font-semibold border border-secondary"
                      : "bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  <Icon name="description" size={16} />
                  Word
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("pptx")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all",
                    isPptx
                      ? "bg-secondary text-on-secondary shadow-md font-semibold border border-secondary"
                      : "bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  <Icon name="slideshow" size={16} />
                  PPT
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("merger")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all",
                    isMerger
                      ? "bg-secondary text-on-secondary shadow-md font-semibold border border-secondary"
                      : "bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  <Icon name="picture_as_pdf" size={16} />
                  PDF Merger
                </button>
              </div>
            </div>

            <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">
              {isWord
                ? "Convert your PDF documents into fully editable Word files instantly."
                : isPptx
                  ? "Transform your PDFs into editable PowerPoint presentations effortlessly."
                  : "Combine multiple PDF documents into a single organized file seamlessly."}
            </p>
          </header>

          <div className="flex flex-wrap items-center justify-stretch sm:justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={resetWorkspace}
              disabled={isProcessing}
              className={`${buttonClass} border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low`}
            >
              <Icon name="note_add" size={18} />
              New
            </button>
            <button
              type="button"
              onClick={() => void processOperation()}
              disabled={isProcessing || (isMerger ? mergeFiles.length < 2 : !file)}
              className={`${buttonClass} bg-secondary text-on-secondary hover:bg-secondary-container btn-glow`}
            >
              <Icon
                name={
                  isProcessing
                    ? "progress_activity"
                    : isWord
                      ? "description"
                      : isPptx
                        ? "slideshow"
                        : "call_merge"
                }
                size={18}
                className={isProcessing ? "animate-spin" : ""}
              />
              {isProcessing
                ? "Working…"
                : isWord
                  ? "Convert to Word"
                  : isPptx
                    ? "Convert to PPTX"
                    : mergeFiles.length > 0
                      ? `Merge ${mergeFiles.length} PDFs`
                      : "Merge PDFs"}
            </button>
            <button
              type="button"
              onClick={downloadResult}
              disabled={isProcessing || status !== "ready"}
              className={`${buttonClass} bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant`}
            >
              <Icon name="download" size={18} />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full px-container-margin-mobile md:px-container-margin-desktop pb-8">
        <div className="w-full h-full flex flex-col lg:flex-row gap-gutter">
          {/* Upload Section */}
          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[280px] sm:min-h-[420px] min-w-0">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon name="picture_as_pdf" size={18} />
                {isMerger
                  ? `Source PDFs (${mergeFiles.length})`
                  : "PDF Document"}
              </span>

              <div className="flex items-center gap-2">
                {isMerger ? (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2.5 py-1 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded text-sm disabled:opacity-50"
                      title="Add more PDFs"
                      disabled={isProcessing}
                      onClick={() => multiFileInputRef.current?.click()}
                    >
                      <Icon name="add" size={16} />
                      Add PDF
                    </button>
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                      disabled={isProcessing}
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          onMultiFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                  </>
                ) : (
                  <>
                    {file ? (
                      <button
                        type="button"
                        className="p-2 text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded disabled:opacity-50"
                        title="Upload new"
                        aria-label="Upload new PDF"
                        disabled={isProcessing}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Icon name="upload" size={18} />
                      </button>
                    ) : null}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                      disabled={isProcessing}
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        e.target.value = "";
                        if (selected) onSingleFile(selected);
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center bg-surface-container-low overflow-y-auto relative min-h-[220px]">
              {isMerger ? (
                mergeFiles.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => multiFileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className="w-full h-full min-h-[220px] sm:min-h-[300px] rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-4 text-center px-4 sm:px-6 hover:border-secondary hover:bg-surface-container-low transition-colors"
                  >
                    <span className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center">
                      <Icon name="upload_file" className="text-outline" />
                    </span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">
                        Upload PDF documents to merge
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                        Select 2 or more PDF files
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-full flex flex-col justify-between gap-4">
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {mergeFiles.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary/10 text-secondary font-semibold text-xs shrink-0">
                              {index + 1}
                            </span>
                            <Icon name="picture_as_pdf" size={24} className="text-error shrink-0" />
                            <div className="min-w-0">
                              <p className="font-label-md text-label-md text-on-surface font-medium truncate">
                                {item.name}
                              </p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">
                                {(item.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMergeFile(index)}
                            disabled={isProcessing}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors"
                            title="Remove file"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/60">
                      <span className="text-xs text-on-surface-variant">
                        Total: {mergeFiles.length} files ({(totalMergeSize / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                      >
                        <Icon name="add" size={16} /> Add another PDF
                      </button>
                    </div>
                  </div>
                )
              ) : !file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  className="w-full h-full min-h-[220px] sm:min-h-[300px] rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-4 text-center px-4 sm:px-6 hover:border-secondary hover:bg-surface-container-low transition-colors"
                >
                  <span className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center">
                    <Icon name="upload_file" className="text-outline" />
                  </span>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">
                      Upload a PDF document
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      PDF files only
                    </p>
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center">
                    <Icon name="picture_as_pdf" size={40} className="text-error" />
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">
                      {file.name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Result Section */}
          <section className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col min-h-[280px] sm:min-h-[420px] min-w-0">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-2">
                <Icon
                  name={isWord ? "description" : isPptx ? "slideshow" : "picture_as_pdf"}
                  size={18}
                />
                {isWord ? "Word Output" : isPptx ? "PPTX Output" : "Merged PDF Output"}
              </span>
            </div>
            <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
              {status === "processing" ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <Icon name="progress_activity" className="text-secondary animate-spin" size={32} />
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">
                      {isWord
                        ? "Converting PDF to Word…"
                        : isPptx
                          ? "Converting PDF to PPTX…"
                          : "Merging PDF files…"}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      This usually takes a few seconds.
                    </p>
                  </div>
                </div>
              ) : status === "error" ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
                    <Icon name="error" className="text-on-error-container" size={28} />
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">Operation failed</p>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">{errorMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void processOperation()}
                    className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:bg-secondary-container"
                  >
                    Try again
                  </button>
                </div>
              ) : status === "ready" ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-xl bg-surface-container-high border border-secondary/30 flex items-center justify-center">
                    <Icon
                      name={isWord ? "description" : isPptx ? "slideshow" : "picture_as_pdf"}
                      size={40}
                      className={isMerger ? "text-error" : "text-secondary"}
                    />
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">
                      {isWord
                        ? file?.name?.replace(/\.pdf$/i, ".docx") || "document.docx"
                        : isPptx
                          ? file?.name?.replace(/\.pdf$/i, ".pptx") || "document.pptx"
                          : `merged_${mergeFiles[0]?.name?.replace(/\.pdf$/i, "") || "document"}.pdf`}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                      Ready to download
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadResult}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:bg-secondary-container btn-glow"
                  >
                    <Icon name="download" size={18} />
                    Download {isWord ? "Word" : isPptx ? "PPTX" : "Merged PDF"} File
                  </button>
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {isMerger
                    ? "Add 2 or more PDF documents, then press Merge PDFs to combine them."
                    : `Upload a PDF, then press Convert to ${isWord ? "Word" : "PPTX"} to see the result here.`}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      {isProcessing ? (
        <OverlayLoader
          message={
            isWord
              ? "Converting PDF to Word…"
              : isPptx
                ? "Converting PDF to PPTX…"
                : "Merging PDF files…"
          }
          description="This usually takes a few seconds."
        />
      ) : null}
    </>
  );
}
