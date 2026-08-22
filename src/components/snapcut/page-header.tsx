type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-4 md:mb-8 min-w-0">
      <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold tracking-tight mb-2">
        {title}
      </h1>
      {description ? (
        <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant">
          {description}
        </p>
      ) : null}
    </header>
  );
}
