import { cn } from "@/lib/utils";

type SmoothTextProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  glow?: boolean;
};

export function SmoothText({ text, className, as: Tag = "span", glow = false }: SmoothTextProps) {
  const words = text.split(" ");

  return (
    <Tag className={cn(className, glow && "animate-text-glow")}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block animate-text-smooth"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </Tag>
  );
}
