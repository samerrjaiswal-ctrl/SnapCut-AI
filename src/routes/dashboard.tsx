import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { ToolCard } from "@/components/snapcut/tool-card";
import { NewProjectDialog } from "@/components/snapcut/new-project-dialog";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { getHistoryStats, listHistory, type HistoryRecord, type HistoryStats } from "@/services/history-service";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard | SnapCut AI" }],
  }),
});

function DashboardPage() {
  const { session } = useAuth();
  const [projectOpen, setProjectOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [stats, setStats] = useState<HistoryStats>({ total: 0, removeText: 0, extractText: 0 });
  const [recent, setRecent] = useState<HistoryRecord[]>([]);
  const name = session?.name?.split(" ")[0] ?? "Creator";

  useEffect(() => {
    if (!session) return;
    void Promise.all([getHistoryStats(session.userId), listHistory(session.userId, "all")])
      .then(([nextStats, items]) => {
        setStats(nextStats);
        setRecent(items.slice(0, 5));
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error(error);
      });
  }, [session]);

  return (
    <AppLayout contentClassName="p-container-margin-mobile md:p-container-margin-desktop">
      <div className="hidden md:flex justify-between items-end mb-8 md:mb-12 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-display text-display text-on-background mb-2 animate-text-smooth">
            Welcome back, {name}.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant animate-text-smooth delay-2">
            {session?.email ? `Signed in as ${session.email}` : "Here is a quick overview of your workspace today."}
          </p>
        </div>
        <div className="flex items-center gap-4 relative">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface-variant hover:text-on-surface"
            aria-label="Notifications"
            onClick={() => setNotifyOpen((v) => !v)}
          >
            <Icon name="notifications" />
          </button>
          {notifyOpen ? (
            <div className="absolute right-0 top-12 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 z-20">
              <p className="font-label-md text-label-md text-on-surface mb-2">Notifications</p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                You have {stats.total} saved {stats.total === 1 ? "operation" : "operations"} in history.
              </p>
            </div>
          ) : null}
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

      <div className="md:hidden mb-6">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background mb-1 animate-text-smooth">
          Welcome back.
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant animate-text-smooth delay-2">
          Ready to create?
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
                No operations yet. Run Remove Text or Image to Text to see activity here.
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
                        name={item.category === "remove-text" ? "ink_eraser" : "article"}
                        size={20}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-label-md text-label-md text-on-background truncate">
                        {item.name}
                      </h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {item.description}
                      </p>
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
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg flex items-center justify-center hover:bg-secondary-container z-40"
      >
        <Icon name="add" size={28} />
      </button>

      <NewProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </AppLayout>
  );
}
