import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ToolCard } from "@/components/snapcut/tool-card";
import { NewProjectDialog } from "@/components/snapcut/new-project-dialog";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { getHistoryStats, listHistory, type HistoryRecord, type HistoryStats } from "@/services/history-service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard | SnapCut AI" }],
  }),
});

const SNAPY_NOTIFY_TEXT = "Generate images with Snapy now in just one prompt";

function SnapyNotifyCard({
  onClose,
  leaving,
  className,
}: {
  onClose: () => void;
  leaving?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "dashboard-notify rounded-2xl border border-white/50 bg-white/35 px-3.5 py-3 shadow-[0_12px_28px_-16px_rgba(19,27,46,0.35)] backdrop-blur-md",
        leaving && "dashboard-notify-out",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
          <Icon name="dashboard" filled className="text-secondary" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-sm text-label-sm text-on-surface mb-0.5">Notifications</p>
          <p className="font-label-sm text-label-sm text-on-surface leading-snug">{SNAPY_NOTIFY_TEXT}</p>
        </div>
        <button
          type="button"
          className="shrink-0 text-on-surface-variant hover:text-on-surface"
          aria-label="Dismiss notification"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { session } = useAuth();
  const [projectOpen, setProjectOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(true);
  const [notifyLeaving, setNotifyLeaving] = useState(false);
  const notifyTimer = useRef<number | null>(null);

  function dismissNotify() {
    if (!notifyOpen || notifyLeaving) return;
    setNotifyLeaving(true);
    if (notifyTimer.current) window.clearTimeout(notifyTimer.current);
    notifyTimer.current = window.setTimeout(() => {
      setNotifyOpen(false);
      setNotifyLeaving(false);
      notifyTimer.current = null;
    }, 400);
  }

  function toggleNotify() {
    if (notifyOpen && !notifyLeaving) {
      dismissNotify();
      return;
    }
    if (notifyTimer.current) {
      window.clearTimeout(notifyTimer.current);
      notifyTimer.current = null;
    }
    setNotifyLeaving(false);
    setNotifyOpen(true);
  }

  useEffect(() => {
    return () => {
      if (notifyTimer.current) window.clearTimeout(notifyTimer.current);
    };
  }, []);
  const [stats, setStats] = useState<HistoryStats>({
    total: 0,
    removeText: 0,
    extractText: 0,
    collages: 0,
    snapy: 0,
  });
  const [recent, setRecent] = useState<HistoryRecord[]>([]);
  const name = session?.name?.split(" ")[0] ?? "Creator";

  useEffect(() => {
    if (!session) return;
    void Promise.all([getHistoryStats(session.userId), listHistory(session.userId, "all", 5)])
      .then(([nextStats, items]) => {
        setStats(nextStats);
        setRecent(items.slice(0, 5));
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error(error);
      });
  }, [session]);

  return (
    <>
      <div className="hidden lg:flex justify-between items-start gap-4 mb-8 md:mb-12 border-b border-outline-variant pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-display text-on-background mb-2">
            Welcome back, {name}.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant truncate">
            {session?.email ? `Signed in as ${session.email}` : "Here is a quick overview of your workspace today."}
          </p>
        </div>
        <div className="relative flex items-start gap-3 shrink-0">
          {notifyOpen ? (
            <SnapyNotifyCard
              leaving={notifyLeaving}
              onClose={dismissNotify}
              className="absolute right-full top-0 mr-3 w-72 pointer-events-auto"
            />
          ) : null}
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface-variant hover:text-on-surface"
            aria-label="Notifications"
            onClick={toggleNotify}
          >
            <Icon name="notifications" />
          </button>
          <button
            type="button"
            onClick={() => setProjectOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-outline-variant hover:bg-surface-variant group btn-glow"
          >
            <Icon name="add" className="text-secondary group-hover:text-secondary-container" />
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              New Project
            </span>
          </button>
        </div>
      </div>

      <div className="lg:hidden mb-6 relative">
        <p className="font-headline-lg-mobile text-headline-lg-mobile text-on-background mb-1">
          Welcome back, {name}.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Ready to create?
        </p>
        {notifyOpen ? (
          <SnapyNotifyCard
            leaving={notifyLeaving}
            onClose={dismissNotify}
            className="absolute left-0 right-0 top-full z-20 mt-2"
          />
        ) : null}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        <ToolCard
          to="/remove-text"
          icon="ink_eraser"
          title="Remove Text"
          description="Effortlessly erase unwanted text or watermarks from any image while preserving the background using AI."
        />
        <ToolCard
          to="/image-to-text"
          icon="article"
          title="Image to Text"
          description="Extract raw text data from screenshots, documents, and complex layouts instantly with high precision OCR."
        />
        <ToolCard
          to="/collage-maker"
          icon="dashboard_customize"
          title="Collage Maker"
          description="Generate professional, seamless collages with intelligent auto-layout and smart framing algorithms."
        />
        <ToolCard
          to="/pdf-to-word"
          icon="description"
          title="PDF to Word"
          description="Convert your PDF documents into fully editable Word files instantly."
        />
        <ToolCard
          to="/pdf-to-pptx"
          icon="slideshow"
          title="PDF to PPTX"
          description="Transform your PDFs into editable PowerPoint presentations effortlessly."
        />
        <ToolCard
          to="/pdf-merger"
          icon="picture_as_pdf"
          title="PDF Merger"
          description="Combine multiple PDF documents into a single organized file seamlessly."
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
            <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-2">
              <Icon name="history" className="text-outline" /> Recent Activity
            </h2>
            <Link
              to="/history"
              className="font-label-sm text-label-sm text-secondary hover:text-secondary-container"
            >
              View All
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recent.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant py-6">
                No operations yet. Run Remove Text, Image to Text, Collage Maker, or Snapy to see activity here.
              </p>
            ) : (
              recent.map((item) => (
                <Link
                  key={item.id}
                  to="/history"
                  className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg group border border-transparent hover:border-outline-variant"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded bg-surface border border-outline-variant flex items-center justify-center text-outline group-hover:text-secondary">
                      <Icon
                        name={
                          item.category === "remove-text"
                            ? "ink_eraser"
                            : item.category === "collage"
                              ? "dashboard_customize"
                              : item.category === "snapy"
                                ? "dashboard"
                                : "article"
                        }
                        size={20}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-label-md text-label-md text-on-background truncate">
                        {item.name}
                      </h4>
                      {item.description.trim().toLowerCase() !== item.name.trim().toLowerCase() ? (
                        <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline-variant shrink-0 ml-3">
                    {item.date}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside className="bg-surface-container-highest border border-outline-variant rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary-fixed-dim rounded-full blur-3xl opacity-40 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="data_usage" className="text-secondary" />
              <h2 className="font-headline-md text-headline-md text-on-background">Your usage</h2>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="font-display text-display text-on-background">{stats.total}</span>
                <span className="font-body-md text-body-md text-on-surface-variant mb-2">
                  total operations
                </span>
              </div>
              <div className="space-y-2 font-label-sm text-label-sm text-on-surface-variant">
                <p>Text removal: {stats.removeText}</p>
                <p>Image to text: {stats.extractText}</p>
                <p>Collages: {stats.collages}</p>
                <p>Snapy: {stats.snapy}</p>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-auto pt-4 border-t border-outline-variant">
            <p className="font-label-md text-label-md text-on-background mb-4">
              Running low on compute? Upgrade your tier for unlimited operations.
            </p>
            <Link
              to="/pricing"
              className="block w-full bg-primary text-on-primary hover:bg-on-surface-variant py-3 rounded-lg font-label-md text-label-md text-center"
            >
              Upgrade Plan
            </Link>
          </div>
        </aside>
      </div>

      <button
        type="button"
        aria-label="New Project"
        onClick={() => setProjectOpen(true)}
        className="lg:hidden fixed right-[5.5rem] w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg flex items-center justify-center hover:bg-secondary-container z-40 bottom-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        <Icon name="add" size={28} />
      </button>

      <NewProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </>
  );
}
