import { cn } from "@/lib/utils";

type SmoothTextProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  glow?: boolean;
  delayMs?: number;
  animate?: boolean;
};

export function SmoothText({
  text,
  className,
  as: Tag = "span",
  glow = false,
  delayMs = 0,
  animate = true,
}: SmoothTextProps) {
  return (
    <Tag
      className={cn(animate ? "animate-text-smooth" : "opacity-0", glow && "animate-text-glow", className)}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {text}
    </Tag>
  );
}
