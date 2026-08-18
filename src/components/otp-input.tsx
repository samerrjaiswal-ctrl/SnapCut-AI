import { useRef, useState } from "react";

export function OtpInput({ length = 6 }: { length?: number }) {
  const [values, setValues] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2 sm:gap-3">
          <input
            ref={(el) => {
              refs.current[index] = el;
            }}
            value={value}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, "").slice(-1);
              setAt(index, digit);
              if (digit && index < length - 1) refs.current[index + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !values[index] && index > 0) {
                refs.current[index - 1]?.focus();
              }
            }}
            className="glass size-12 rounded-lg text-center font-mono text-2xl font-bold text-foreground outline-none focus:border-cyan focus:ring-4 focus:ring-cyan/20 sm:size-14"
          />
          {index === length / 2 - 1 ? (
            <span className="text-muted-foreground">-</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
