import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyImageFromLoader } from "@/lib/copy-image";
import { Icon } from "@/components/snapcut/icon";
import { getSignedFileUrl, downloadHistoryFile, downloadFileName, type HistoryRecord } from "@/services/history-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HistoryCardProps = {
  item: HistoryRecord;
  onDelete?: (item: HistoryRecord) => void;
};

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export function HistoryCard({ item, onDelete }: HistoryCardProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item.thumbnail || null);
  const isOcr = item.category === "image-to-text";
  const canCopyImage =
    item.category === "snapy" || item.category === "remove-text" || item.category === "collage";
  const thumbSrc =
    item.category === "remove-text"
      ? item.resultUrl || item.thumbnail || null
      : item.category === "snapy" || item.category === "collage"
        ? item.resultUrl || item.thumbnail || null
        : null;
  const [liveThumb, setLiveThumb] = useState<string | null>(thumbSrc);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbRetried, setThumbRetried] = useState(false);
  const copyBlobRef = useRef<Blob | null>(null);
  const copyPath = canCopyImage ? item.resultPath || item.originalPath : null;

  useEffect(() => {
    setLiveThumb(thumbSrc);
    setThumbLoaded(false);
    setThumbRetried(false);
  }, [thumbSrc]);

  const icon =
    item.category === "remove-text"
      ? "ink_eraser"
      : item.category === "image-to-text"
        ? "article"
        : item.category === "snapy"
          ? "dashboard"
          : "dashboard_customize";

  function prefetchCopyBlob() {
    if (!copyPath || copyBlobRef.current) return;
    void downloadHistoryFile(copyPath)
      .then((blob) => {
        copyBlobRef.current = blob;
      })
      .catch(() => undefined);
  }

  function copyImage() {
    if (!copyPath && !copyBlobRef.current) {
      toast.error("This image is not available to copy.");
      return;
    }
    void copyImageFromLoader(async () => {
      if (copyBlobRef.current) return copyBlobRef.current;
      if (!copyPath) throw new Error("This image is not available to copy.");
      const blob = await downloadHistoryFile(copyPath);
      copyBlobRef.current = blob;
      return blob;
    })
      .then(() => toast.success("Image copied."))
      .catch(() => toast.error("Could not copy this image. Try Open instead."));
  }

  function copyText() {
    if (!item.extractedText) return;
    void navigator.clipboard.writeText(item.extractedText)
      .then(() => toast.success("Copied extracted text."))
      .catch(() => toast.error("Could not copy. Open the item and copy the text manually."));
  }

  async function resolveFileUrls() {
    const [originalUrl, resultUrl] = await Promise.all([
      getSignedFileUrl(item.originalPath),
      getSignedFileUrl(item.resultPath),
    ]);
    return { originalUrl, resultUrl };
  }

  async function downloadItem() {
    try {
      if (item.category === "image-to-text" && item.extractedText) {
        const blob = new Blob([item.extractedText], { type: "text/plain" });
        saveBlob(blob, `${item.name.replace(/\.[^.]+$/, "")}.txt`);
        toast.success("Download started.");
        return;
      }
      const path =
        item.category === "remove-text" || item.category === "snapy"
          ? item.resultPath || item.originalPath
          : item.resultPath || item.originalPath;
      if (!path) {
        toast.error("This file is not available to download.");
        return;
      }
      const blob = await downloadHistoryFile(path);
      saveBlob(blob, downloadFileName(item.name, path));
      toast.success("Download started.");
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      toast.error("Unable to download this file. Please try again.");
    }
  }

  return (
    <article className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden group hover:border-secondary hover-lift relative">
      <div className="aspect-[4/3] bg-surface-container relative">
        {isOcr ? (
          <div className="h-full w-full overflow-hidden p-4">
            <p className="h-full overflow-hidden font-body-md text-body-md text-on-surface whitespace-pre-wrap break-words line-clamp-8">
              {item.extractedText?.trim() || "No text was saved for this item."}
            </p>
          </div>
        ) : liveThumb ? (
          <>
            {!thumbLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="progress_activity" className="text-secondary animate-spin" size={22} />
              </div>
            ) : null}
            <img
              className={cn("w-full h-full object-cover", !thumbLoaded && "opacity-0")}
              alt={item.category === "remove-text" ? "Cleaned result" : item.category === "snapy" ? "Generated image" : ""}
              src={liveThumb}
              onLoad={() => setThumbLoaded(true)}
              onError={() => {
                if (thumbRetried) {
                  setThumbLoaded(true);
                  return;
                }
                setThumbRetried(true);
                const path = item.resultPath || item.originalPath;
                void getSignedFileUrl(path).then((fresh) => {
                  if (fresh && fresh !== liveThumb) {
                    setThumbLoaded(false);
                    setLiveThumb(fresh);
                    return;
                  }
                  setThumbLoaded(true);
                });
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <Icon name={icon} size={32} />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm p-1.5 rounded-md border border-outline-variant/50 flex items-center justify-center">
          <Icon name={icon} className="text-on-surface" size={18} />
        </div>
      </div>
      <div className="p-4 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-label-md text-label-md text-on-surface font-semibold truncate">
            {item.name}
          </h3>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{item.date}</p>
        </div>
        <DropdownMenu
          onOpenChange={(next) => {
            if (next) prefetchCopyBlob();
          }}
        >
          <DropdownMenuTrigger
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container"
            aria-label={`More actions for ${item.name}`}
          >
            <Icon name="more_vert" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.category === "pdf-operations" ? (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    const isWord =
                      item.description?.toLowerCase().includes("word") ||
                      item.name?.toLowerCase().includes("word");
                    
                    fetch("https://sameerjaiswal.app.n8n.cloud/webhook/pdf-to-word", {
                      method: "POST",
                      body: JSON.stringify({ item }),
                    }).catch(() => {});
                    
                    toast.success(`Opening in ${isWord ? "Word" : "PPT"}`);
                  }}
                >
                  {item.description?.toLowerCase().includes("word") ||
                  item.name?.toLowerCase().includes("word")
                    ? "Open in Word"
                    : "Open in PPT"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void downloadItem()}>Download</DropdownMenuItem>
              </>
            ) : (
              <>
                {canCopyImage ? (
                  <DropdownMenuItem onSelect={() => copyImage()}>Copy image</DropdownMenuItem>
                ) : null}
                {isOcr && item.extractedText ? (
                  <DropdownMenuItem onSelect={() => copyText()}>Copy text</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => void downloadItem()}>Download</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void (async () => {
                      if (isOcr) {
                        setOpen(true);
                        return;
                      }
                      const urls = await resolveFileUrls();
                      setPreviewUrl(
                        urls.resultUrl || item.resultUrl || item.thumbnail || urls.originalUrl || null,
                      );
                      setOpen(true);
                    })();
                  }}
                >
                  Open
                </DropdownMenuItem>
                {onDelete ? (
                  <DropdownMenuItem
                    onClick={() => {
                      onDelete(item);
                    }}
                  >
                    Remove
                  </DropdownMenuItem>
                ) : null}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-container-lowest border-outline-variant max-w-lg">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>
              {item.category === "remove-text"
                ? "Text removal"
                : item.category === "collage"
                  ? "Collage"
                  : item.category === "snapy"
                    ? "Snapy"
                    : "Image to text"}{" "}
              · {item.date}
            </DialogDescription>
          </DialogHeader>
          {isOcr ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-body-md text-body-md text-on-surface bg-surface-container-low rounded-lg p-4">
              {item.extractedText || "No text was saved for this item."}
            </pre>
          ) : previewUrl ? (
            <img src={previewUrl} alt="Processed result" className="w-full rounded-lg border border-outline-variant" />
          ) : null}
        </DialogContent>
      </Dialog>
    </article>
  );
}
