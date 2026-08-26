import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";

type ToolCardProps = {
  to: string;
  icon: string;
  title: string;
  description: string;
  cta?: string;
  className?: string;
  badge?: string;
};

export function ToolCard({
  to,
  icon,
  title,
  description,
  cta = "Open Tool",
  className,
  badge,
}: ToolCardProps) {
  return (
    <Link
      to={to}
      preload="intent"
      className={cn(
        "group relative bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover-lift overflow-hidden flex flex-col h-full min-h-[220px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform text-secondary">
            <Icon name={icon} filled />
          </div>
          {badge ? (
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container rounded-md px-2 py-0.5">
              {badge}
            </span>
          ) : null}
        </div>
        <h3 className="font-headline-md text-headline-md text-on-background mb-2">{title}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant flex-grow">{description}</p>
        <div className="mt-4 flex items-center text-secondary font-label-md text-label-md group-hover:translate-x-1 transition-transform">
          {cta} <Icon name="arrow_forward" size={18} className="ml-1" />
        </div>
      </div>
    </Link>
  );
}
