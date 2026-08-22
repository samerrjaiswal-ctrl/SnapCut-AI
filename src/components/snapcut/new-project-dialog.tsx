import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/snapcut/icon";

const TOOLS = [
  { to: "/remove-text", icon: "ink_eraser", title: "Remove Text" },
  { to: "/image-to-text", icon: "article", title: "Image to Text" },
  { to: "/collage-maker", icon: "dashboard_customize", title: "Collage Maker" },
] as const;

type NewProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-container-lowest border-outline-variant rounded-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline-md text-headline-md text-on-surface">
            New Project
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Choose a tool to start working.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              preload="intent"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 hover:border-secondary hover:bg-surface-container-low"
            >
              <span className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                <Icon name={tool.icon} filled />
              </span>
              <span className="font-label-md text-label-md text-on-surface">{tool.title}</span>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
