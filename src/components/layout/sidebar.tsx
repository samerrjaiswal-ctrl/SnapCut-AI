import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/snapcut/icon";
import { useAuth } from "@/components/providers/auth-provider";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/remove-text", label: "Remove Text", icon: "ink_eraser" },
  { to: "/image-to-text", label: "Image to Text", icon: "article" },
  { to: "/collage-maker", label: "Collage Maker", icon: "dashboard_customize" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/settings", label: "Settings", icon: "settings" },
] as const;

type SidebarProps = {
  activePath: string;
};

export function Sidebar({ activePath }: SidebarProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="hidden md:flex flex-col p-6 gap-2 bg-primary-container text-on-primary-fixed fixed left-0 top-0 h-full w-sidebar-width border-r border-outline-variant z-50">
      <div className="flex flex-col gap-1 mb-8 pl-4 pt-2">
        <div className="flex items-center gap-3">
          <Icon name="dashboard" filled className="text-secondary" />
          <span className="font-headline-md text-headline-md font-black text-on-primary">
            SnapCut AI
          </span>
        </div>
        <span className="text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider mt-2">
          Premium SaaS
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-grow overflow-y-auto sidebar-scroll pr-2">
        {NAV_ITEMS.map((item, index) => {
          const active = activePath === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2 font-label-md text-label-md border-l-4",
                index === 4 && "mt-4",
                active
                  ? "bg-secondary-container text-on-secondary-container border-secondary shadow-sm"
                  : "text-on-primary-container border-transparent hover:bg-on-primary-fixed-variant",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} filled={active} />
              <span className={cn(active && "font-bold")}>{item.label}</span>
            </Link>
          );
        })}
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
          <span className="text-error">Logout</span>
        </button>
      </div>
    </nav>
  );
}
