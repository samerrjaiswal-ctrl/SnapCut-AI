import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";

type ToolActionsProps = {
  actionLabel: string;
  actionIcon?: string;
  actionDisabled?: boolean;
  downloadDisabled?: boolean;
  busy?: boolean;
  onNew: () => void;
  onAction: () => void;
  onDownload: () => void;
};

export function ToolActions({
  actionLabel,
  actionIcon = "auto_awesome",
  actionDisabled,
  downloadDisabled,
  busy,
  onNew,
  onAction,
  onDownload,
}: ToolActionsProps) {
  const buttonClass =
    "inline-flex items-center gap-2 h-10 px-4 rounded-lg font-label-md text-label-md disabled:opacity-45 disabled:pointer-events-none";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onNew}
        disabled={busy}
        className={cn(buttonClass, "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low")}
      >
        <Icon name="note_add" size={18} />
        New
      </button>
      <button
        type="button"
        onClick={onAction}
        disabled={busy || actionDisabled}
        className={cn(buttonClass, "bg-secondary text-on-secondary hover:bg-secondary-container btn-glow")}
      >
        <Icon name={busy ? "progress_activity" : actionIcon} size={18} className={busy ? "animate-spin" : ""} />
        {busy ? "Working…" : actionLabel}
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy || downloadDisabled}
        className={cn(buttonClass, "bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant")}
      >
        <Icon name="download" size={18} />
        Download
      </button>
    </div>
  );
}
