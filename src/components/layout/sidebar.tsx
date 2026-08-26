import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { TOOL_CATEGORIES, findCategoryForPath } from "@/data/tools";

type SidebarProps = {
  activePath: string;
};

function pathActive(activePath: string, route: string) {
  return activePath === route || activePath.startsWith(`${route}/`);
}

export function Sidebar({ activePath }: SidebarProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const activeCategory = findCategoryForPath(activePath);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of TOOL_CATEGORIES) {
      initial[cat.id] = activeCategory?.id === cat.id;
    }
    return initial;
  });

  useEffect(() => {
    if (!activeCategory) return;
    setOpenGroups((prev) => ({ ...prev, [activeCategory.id]: true }));
  }, [activeCategory?.id]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const historyActive = pathActive(activePath, "/history");
  const settingsActive = pathActive(activePath, "/settings");
  const dashboardActive = activePath === "/dashboard";

  return (
    <nav className="hidden lg:flex flex-col p-6 gap-2 bg-primary-container text-on-primary-fixed fixed left-0 top-0 h-full w-sidebar-width border-r border-outline-variant z-50 overflow-hidden">
      <div className="flex flex-col gap-1 mb-6 pl-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-on-primary/10 flex items-center justify-center shrink-0">
            <Icon name="dashboard" filled className="text-secondary" size={22} />
          </div>
          <span className="font-headline-md text-headline-md font-black text-on-primary">
            SnapCut AI
          </span>
        </div>
        <span className="text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider mt-2">
          Premium SaaS
        </span>
      </div>

      <div className="flex flex-col gap-1 flex-grow overflow-y-auto sidebar-scroll pr-2">
        <Link
          to="/dashboard"
          preload="intent"
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2 font-label-md text-label-md border-l-4",
            dashboardActive
              ? "bg-secondary-container text-on-secondary-container border-secondary shadow-sm"
              : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
          )}
          aria-current={dashboardActive ? "page" : undefined}
        >
          <Icon name="dashboard" filled={dashboardActive} />
          <span className={cn(dashboardActive && "font-bold")}>Dashboard</span>
        </Link>

        {TOOL_CATEGORIES.map((category) => {
          const open = openGroups[category.id] ?? false;
          const categoryActive = activeCategory?.id === category.id;
          return (
            <div key={category.id} className="mt-1">
              <button
                type="button"
                onClick={() => toggleGroup(category.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-4 py-2 font-label-md text-label-md border-l-4 text-left",
                  categoryActive && !category.tools.some((t) => pathActive(activePath, t.route))
                    ? "bg-on-primary/10 text-on-primary border-secondary/60"
                    : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
                )}
                aria-expanded={open}
              >
                <Icon name={category.icon} filled={categoryActive} />
                <span className={cn("flex-1", categoryActive && "font-semibold")}>{category.name}</span>
                <Icon
                  name={open ? "expand_less" : "expand_more"}
                  size={18}
                  className="opacity-80"
                />
              </button>
              {open ? (
                <div className="mt-1 ml-2 flex flex-col gap-0.5 border-l border-on-primary-fixed-variant/40 pl-2">
                  <Link
                    to={category.hubRoute}
                    preload="intent"
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 font-label-sm text-label-sm border-l-2",
                      activePath === category.hubRoute || activePath === `${category.hubRoute}/`
                        ? "bg-secondary-container text-on-secondary-container border-secondary"
                        : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
                    )}
                  >
                    <Icon name="grid_view" size={16} />
                    <span>Overview</span>
                  </Link>
                  {category.tools.map((tool) => {
                    const active = pathActive(activePath, tool.route);
                    return (
                      <Link
                        key={tool.id}
                        to={tool.route}
                        preload="intent"
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 font-label-sm text-label-sm border-l-2",
                          active
                            ? "bg-secondary-container text-on-secondary-container border-secondary shadow-sm font-semibold"
                            : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon name={tool.icon} size={16} filled={active} />
                        <span className="truncate">{tool.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="mt-4 flex flex-col gap-1">
          <Link
            to="/history"
            preload="intent"
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2 font-label-md text-label-md border-l-4",
              historyActive
                ? "bg-secondary-container text-on-secondary-container border-secondary shadow-sm"
                : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
            )}
            aria-current={historyActive ? "page" : undefined}
          >
            <Icon name="history" filled={historyActive} />
            <span className={cn(historyActive && "font-bold")}>History</span>
          </Link>
          <Link
            to="/settings"
            preload="intent"
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2 font-label-md text-label-md border-l-4",
              settingsActive
                ? "bg-secondary-container text-on-secondary-container border-secondary shadow-sm"
                : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
            )}
            aria-current={settingsActive ? "page" : undefined}
          >
            <Icon name="settings" filled={settingsActive} />
            <span className={cn(settingsActive && "font-bold")}>Settings</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-auto pt-6 border-t border-on-primary-fixed-variant">
        <div className="bg-surface-tint rounded-lg p-4 flex flex-col gap-3 items-start border border-outline-variant">
          <div className="flex items-center gap-2">
            <Icon name="workspace_premium" className="text-tertiary-fixed-dim" />
            <span className="font-label-md text-label-md text-on-primary font-semibold">
              {session?.plan === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-primary-container">
            {session?.plan === "pro" ? "Advanced AI tools are unlocked." : "Unlock advanced AI tools."}
          </span>
          <Link
            to="/pricing"
            preload="intent"
            className="bg-secondary text-on-secondary hover:bg-secondary-container px-4 py-2 rounded font-label-md text-label-md transition-colors w-full text-center"
          >
            {session?.plan === "pro" ? "View plans" : "Upgrade to Pro"}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Logout"
          onClick={() => {
            void (async () => {
              await logout();
              toast.success("Signed out. Your files are still saved.");
              await navigate({ to: "/", replace: true, viewTransition: true });
            })();
          }}
          className="flex items-center gap-3 text-on-primary-container hover:bg-on-primary-fixed-variant rounded-lg px-4 py-2 font-label-md text-label-md text-left"
        >
          <Icon name="logout" className="text-error" />
          <span className="text-error" aria-hidden="true">
            Logout
          </span>
        </button>
      </div>
    </nav>
  );
}
