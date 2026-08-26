import { Link } from "@tanstack/react-router";
import { ToolCard } from "@/components/snapcut/tool-card";
import type { ToolDef } from "@/data/tools";

type ToolSectionProps = {
  title: string;
  viewAllTo?: string;
  tools: ToolDef[];
  limit?: number;
};

export function ToolSection({ title, viewAllTo, tools, limit }: ToolSectionProps) {
  const items = typeof limit === "number" ? tools.slice(0, limit) : tools;

  return (
    <section className="mb-10 md:mb-12">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="font-headline-md text-headline-md text-on-background">{title}</h2>
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            preload="intent"
            className="font-label-sm text-label-sm text-secondary hover:text-secondary-container shrink-0"
          >
            View All →
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((tool) => (
          <ToolCard
            key={tool.id}
            to={tool.route}
            icon={tool.icon}
            title={tool.name}
            description={tool.description}
            badge={tool.comingSoon ? "Soon" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

type ToolHubProps = {
  title: string;
  description: string;
  tools: ToolDef[];
};

export function ToolHub({ title, description, tools }: ToolHubProps) {
  return (
    <div>
      <header className="mb-8 md:mb-10 min-w-0">
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold tracking-tight mb-2">
          {title}
        </h1>
        <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant max-w-3xl">
          {description}
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            to={tool.route}
            icon={tool.icon}
            title={tool.name}
            description={tool.description}
            badge={tool.comingSoon ? "Soon" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
