import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";

type ProcessingStateProps = {
  message?: string;
  description?: string;
  className?: string;
};

export function ProcessingState({
  message = "Processing your image…",
  description = "This may take a few seconds.",
  className,
}: ProcessingStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-outline-variant bg-[#F5F3FF] min-h-[280px] flex flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-secondary-fixed">
        <div className="h-full w-1/3 bg-secondary animate-[shimmer_1.2s_ease_infinite]" />
      </div>
      <Icon name="progress_activity" className="text-secondary animate-spin" />
      <p className="font-label-md text-label-md text-on-surface">{message}</p>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
    </div>
  );
}

type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
};

export function EmptyState({ icon = "inbox", title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest min-h-[240px] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name={icon} className="text-outline" size={40} />
      <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
      {description ? (
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">{description}</p>
      ) : null}
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-error-container bg-error-container/40 min-h-[200px] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="error" className="text-error" />
      <h3 className="font-label-md text-label-md text-on-error-container">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="bg-primary-container text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
