import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Download, KeyRound, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/recovery-codes")({
  head: () => ({
    meta: [
      { title: "Save your recovery codes | AegisGuard" },
      {
        name: "description",
        content:
          "Download and store twelve single-use AegisGuard recovery codes so you never lose access if your authenticator is unavailable.",
      },
      { property: "og:title", content: "Save your recovery codes | AegisGuard" },
      {
        property: "og:description",
        content: "Twelve single-use emergency codes for account recovery.",
      },
    ],
  }),
  component: RecoveryCodes,
});

const codes = [
  "A1B2-C3D4",
  "E5F6-G7H8",
  "I9J0-K1L2",
  "M3N4-O5P6",
  "Q7R8-S9T0",
  "U1V2-W3X4",
  "Y5Z6-A7B8",
  "C9D0-E1F2",
  "G3H4-I5J6",
  "K7L8-M9N0",
  "O1P2-Q3R4",
  "S5T6-U7V8",
];

function RecoveryCodes() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegisguard-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Recovery Codes">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-border bg-cyan/10">
            <KeyRound className="size-7 text-cyan" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Save Your Recovery Codes</h2>
          <p className="text-muted-foreground">
            Recovery codes can help you access your account if your authenticator is unavailable.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
          <TriangleAlert className="size-5 shrink-0 text-warning" />
          <p className="text-sm text-foreground">Each recovery code can only be used once.</p>
        </div>

        <div className="glass mb-6 grid grid-cols-2 gap-3 rounded-2xl p-6 sm:grid-cols-3">
          {codes.map((code) => (
            <span
              key={code}
              className="rounded-lg border border-border bg-white/5 py-2 text-center font-mono text-sm tracking-wider text-foreground"
            >
              {code}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={copy}
            className="glass glass-hover flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-semibold text-foreground"
          >
            {copied ? (
              <>
                <Check className="size-5 text-success" /> Copied!
              </>
            ) : (
              <>
                <Copy className="size-5" /> Copy Codes
              </>
            )}
          </button>
          <button
            type="button"
            onClick={download}
            className="glass glass-hover flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-semibold text-foreground"
          >
            <Download className="size-5" />
            Download
          </button>
        </div>

        <Link
          to="/dashboard"
          className="mt-4 flex items-center justify-center rounded-lg bg-brand-gradient py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_var(--cyan)]"
        >
          I&apos;ve Saved Them
        </Link>
      </div>
    </AppShell>
  );
}
