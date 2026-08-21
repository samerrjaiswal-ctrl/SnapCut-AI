import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/snapcut/icon";
import { getSignedFileUrl, type HistoryRecord } from "@/services/history-service";
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

function downloadFromUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
}

export function HistoryCard({ item, onDelete }: HistoryCardProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item.thumbnail || null);

  const icon =
    item.category === "remove-text"
      ? "ink_eraser"
      : item.category === "image-to-text"
        ? "article"
        : "dashboard_customize";

  async function copyText() {
    if (!item.extractedText) return;
    await navigator.clipboard.writeText(item.extractedText);
    toast.success("Copied extracted text.");
  }

  async function resolveFileUrls() {
    const [originalUrl, resultUrl] = await Promise.all([
      getSignedFileUrl(item.originalPath),
      getSignedFileUrl(item.resultPath),
    ]);
    return { originalUrl, resultUrl };
  }

  async function downloadItem() {
    if (item.category === "image-to-text" && item.extractedText) {
      const blob = new Blob([item.extractedText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      downloadFromUrl(url, `${item.name.replace(/\.[^.]+$/, "")}.txt`);
      URL.revokeObjectURL(url);
      return;
    }
    const urls = await resolveFileUrls();
    const url = urls.resultUrl || urls.originalUrl || item.thumbnail;
    if (!url) {
      toast.error("This file is not available to download.");
      return;
    }
    downloadFromUrl(url, item.name);
  }

  return (
    <article className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden group hover:border-secondary hover-lift relative">
      <div className="aspect-[4/3] bg-surface-container relative">
        {item.thumbnail ? (
          <img className="w-full h-full object-cover" alt="" src={item.thumbnail} />
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
        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container"
            aria-label={`More actions for ${item.name}`}
          >
            <Icon name="more_vert" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void downloadItem()}>Download</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void (async () => {
                  const urls = await resolveFileUrls();
                  setPreviewUrl(urls.resultUrl || urls.originalUrl || item.thumbnail || null);
                  setOpen(true);
                })();
              }}
            >
              Open
            </DropdownMenuItem>
            {item.extractedText ? (
              <DropdownMenuItem onClick={() => void copyText()}>Copy text</DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <DropdownMenuItem
                onClick={() => {
                  onDelete(item);
                }}
              >
                Remove
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-container-lowest border-outline-variant max-w-lg">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>
              {item.category === "remove-text" ? "Text removal" : "Image to text"} · {item.date}
            </DialogDescription>
          </DialogHeader>
          {item.category === "remove-text" ? (
            <div className="grid gap-3">
              {previewUrl ? (
                <img src={previewUrl} alt="Processed result" className="w-full rounded-lg border border-outline-variant" />
              ) : null}
            </div>
          ) : (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-body-md text-body-md text-on-surface bg-surface-container-low rounded-lg p-4">
              {item.extractedText || "No text was saved for this item."}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
