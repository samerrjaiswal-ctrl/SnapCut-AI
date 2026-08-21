type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8 md:mb-12">
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold tracking-tight mb-2 animate-text-smooth">
        {title}
      </h1>
      {description ? (
        <p className="font-body-lg text-body-lg text-on-surface-variant animate-text-smooth delay-2">
          {description}
        </p>
      ) : null}
    </header>
  );
}
