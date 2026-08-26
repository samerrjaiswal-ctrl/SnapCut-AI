import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { RequireAuth } from "@/components/auth/auth-guards";
import { getSignedFileUrl, downloadHistoryFile, downloadFileName } from "@/services/history-service";

type PreviewKind = "pdf" | "word" | "ppt";

type FilePreviewSearch = {
  path?: string;
  kind?: PreviewKind;
  name?: string;
};

const signedUrlCache = new Map<string, Promise<string | null>>();

function getCachedSignedUrl(path: string) {
  const existing = signedUrlCache.get(path);
  if (existing) return existing;
  const pending = getSignedFileUrl(path).finally(() => {
    window.setTimeout(() => signedUrlCache.delete(path), 8_000);
  });
  signedUrlCache.set(path, pending);
  return pending;
}

export const Route = createFileRoute("/file-preview")({
  validateSearch: (search: Record<string, unknown>): FilePreviewSearch => ({
    path: typeof search.path === "string" ? search.path : undefined,
    kind:
      search.kind === "pdf" || search.kind === "word" || search.kind === "ppt"
        ? search.kind
        : undefined,
    name: typeof search.name === "string" ? search.name : undefined,
  }),
  component: FilePreviewPage,
  head: ({ match }) => ({
    meta: [
      {
        title: `${match.search.name || "File preview"} | SnapCut AI`,
      },
    ],
  }),
});

function FilePreviewPage() {
  return (
    <RequireAuth>
      <FilePreviewBody />
    </RequireAuth>
  );
}

function FilePreviewBody() {
  const { path, kind: kindParam, name } = Route.useSearch();
  const kind = useMemo<PreviewKind>(() => {
    if (kindParam) return kindParam;
    const lower = (path || name || "").toLowerCase();
    if (lower.endsWith(".docx") || lower.includes("word")) return "word";
    if (lower.endsWith(".pptx") || lower.includes("ppt")) return "ppt";
    return "pdf";
  }, [kindParam, path, name]);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestId.current;
    async function load() {
      if (!path) {
        setError("Missing file path.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setFrameReady(false);
      setError(null);
      try {
        const url = await getCachedSignedUrl(path);
        if (cancelled || id !== requestId.current) return;
        if (!url) throw new Error("Could not create a preview link.");
        setSignedUrl(url);
      } catch (err) {
        if (cancelled || id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Unable to open this file.");
      } finally {
        if (!cancelled && id === requestId.current) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  async function handleDownload() {
    if (!path) return;
    try {
      const blob = await downloadHistoryFile(path);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadFileName(name || "document", path);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      setError("Unable to download this file.");
    }
  }

  const title =
    name ||
    (kind === "word" ? "Word document" : kind === "ppt" ? "PowerPoint" : "PDF document");

  const officeEmbed =
    signedUrl && kind !== "pdf"
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`
      : null;

  const frameSrc = kind === "pdf" ? signedUrl : officeEmbed;
  const showFrameLoader = Boolean(frameSrc) && !frameReady && !error;

  return (
    <div className="bg-background text-on-background min-h-dvh flex flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/history"
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
            aria-label="Back to History"
          >
            <Icon name="arrow_back" size={22} />
          </Link>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
              {title}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {kind === "word"
                ? "Word preview"
                : kind === "ppt"
                  ? "PowerPoint preview"
                  : "PDF preview"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-on-primary-fixed-variant"
        >
          <Icon name="download" size={18} />
          Download
        </button>
      </header>

      <main className="flex-1 min-h-0 relative bg-surface-container">
        {loading || showFrameLoader ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-on-surface-variant bg-surface-container">
            <Icon name="progress_activity" className="animate-spin text-secondary" size={28} />
            <p className="font-body-md text-body-md">Opening file…</p>
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Icon name="error" className="text-error" size={36} />
            <p className="font-body-md text-body-md text-on-surface">{error}</p>
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="mt-2 h-10 px-4 rounded-lg border border-outline-variant font-label-md text-label-md"
            >
              Download instead
            </button>
          </div>
        ) : frameSrc ? (
          <iframe
            title={title}
            src={frameSrc}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            onLoad={() => setFrameReady(true)}
          />
        ) : !loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-body-md text-body-md text-on-surface-variant">Nothing to preview.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
