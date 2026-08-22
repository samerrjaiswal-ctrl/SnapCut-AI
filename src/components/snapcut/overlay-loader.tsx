import { Icon } from "@/components/snapcut/icon";

type OverlayLoaderProps = {
  message: string;
  description?: string;
};

export function OverlayLoader({ message, description }: OverlayLoaderProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-primary/45 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-fixed">
          <Icon name="progress_activity" className="text-secondary animate-spin" size={28} />
        </div>
        <p className="font-label-md text-label-md text-on-surface">{message}</p>
        {description ? (
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
