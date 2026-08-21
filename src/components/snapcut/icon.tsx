import { cn } from "@/lib/utils";

type IconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
};

export function Icon({ name, className, filled = false, size }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", className)}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...(size ? { fontSize: size } : {}),
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
