import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { HistoryCard } from "@/components/snapcut/history-card";
import { EmptyState, ErrorState } from "@/components/snapcut/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { deleteHistoryItem, listHistory, type HistoryRecord } from "@/services/history-service";
import { cn } from "@/lib/utils";
import type { HistoryCategory } from "@/data/mock-history";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [{ title: "History | SnapCut AI" }],
  }),
});

const TABS: { id: "all" | HistoryCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "remove-text", label: "Remove Text" },
  { id: "image-to-text", label: "Image to Text" },
  { id: "collage", label: "Collages" },
];

function HistoryPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"all" | HistoryCategory>("all");
  const [items, setItems] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listHistory(session.userId, tab);
      setItems(rows);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      setError("Unable to load your history right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(item: HistoryRecord) {
    if (!session) return;
    try {
      await deleteHistoryItem(session.userId, item);
      setItems((current) => current.filter((row) => row.id !== item.id));
      toast.success("Removed from history.");
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      toast.error("Unable to delete this item. Please try again.");
    }
  }

  return (
    <AppLayout contentClassName="p-container-margin-mobile md:p-container-margin-desktop">
      <header className="mb-12">
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2 animate-text-smooth">
          History
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant animate-text-smooth delay-2">
          Manage and review your previously processed items.
        </p>
      </header>

      <div
        className="flex items-center gap-6 border-b border-outline-variant mb-8 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "font-label-md text-label-md pb-2 px-1 whitespace-nowrap",
              tab === item.id
                ? "text-secondary font-bold border-b-2 border-secondary"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Couldn't load history" description={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="history"
          title="No items in this category"
          description="Processed files from this tool will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {items.map((item) => (
            <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
