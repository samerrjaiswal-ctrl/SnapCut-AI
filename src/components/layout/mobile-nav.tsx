import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/snapcut/icon";

const MOBILE_ITEMS = [
  {
    to: "/dashboard",
    label: "Tools",
    icon: "auto_fix_high",
    match: ["/dashboard", "/remove-text", "/image-to-text", "/collage-maker"],
  },
  { to: "/history", label: "History", icon: "history", match: ["/history"] },
  { to: "/settings", label: "Account", icon: "person", match: ["/settings"] },
] as const;

type MobileNavProps = {
  activePath: string;
};

export function MobileNav({ activePath }: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 w-full z-50 rounded-t-xl bg-surface-container-highest border-t border-outline-variant shadow-lg flex justify-around items-center px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      {MOBILE_ITEMS.map((item) => {
        const active = item.match.some((path) => activePath === path || activePath.startsWith(`${path}/`));

        return (
          <Link
            key={item.to}
            to={item.to}
            preload="intent"
            className={cn(
              "flex flex-col items-center justify-center rounded-full px-4 py-1 scale-90 font-label-sm text-label-sm",
              active
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
          >
            <Icon name={item.icon} filled={active} className="mb-1" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
