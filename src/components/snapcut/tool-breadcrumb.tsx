import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";

export type Crumb = {
  label: string;
  to?: string;
};

type ToolBreadcrumbProps = {
  items: Crumb[];
};

export function ToolBreadcrumb({ items }: ToolBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3 md:mb-4">
      <ol className="flex flex-wrap items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1 min-w-0">
              {index > 0 ? (
                <Icon name="chevron_right" size={16} className="text-outline shrink-0" />
              ) : null}
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-secondary truncate">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "text-on-surface truncate" : "truncate"}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
