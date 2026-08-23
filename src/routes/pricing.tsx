import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icon } from "@/components/snapcut/icon";
import { MarketingFooter, MarketingHeader } from "@/components/layout/marketing-shell";
import { SmoothText } from "@/components/snapcut/smooth-text";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [{ title: "SnapCut AI - Pricing" }],
  }),
});

function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const { session, ready, mfaPending } = useAuth();
  const signedIn = ready && Boolean(session) && !mfaPending;
  const proPrice = yearly ? 15 : 19;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      <MarketingHeader active="pricing" />
      <main className="min-h-0 flex-1 px-container-margin-mobile md:px-container-margin-desktop py-10 md:py-24">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <header className="text-center mb-12">
            <SmoothText
              as="h1"
              text="Simple, transparent pricing"
              className="font-display text-display text-on-surface mb-4"
              glow
            />
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto animate-text-smooth delay-3">
              Start for free, upgrade when you need more power. No hidden fees.
            </p>
          </header>

          <div
            className="flex flex-wrap items-center justify-center mb-10 md:mb-16 gap-2 sm:gap-4 bg-surface-container-low p-1 rounded-full border border-outline-variant/30"
            role="tablist"
            aria-label="Billing period"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!yearly}
              onClick={() => setYearly(false)}
              className={cn(
                "px-6 py-2 rounded-full font-label-md text-label-md",
                !yearly
                  ? "bg-white shadow-sm border border-outline-variant/50 text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={yearly}
              onClick={() => setYearly(true)}
              className={cn(
                "px-6 py-2 rounded-full font-label-md text-label-md",
                yearly
                  ? "bg-white shadow-sm border border-outline-variant/50 text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              Yearly <span className="text-secondary text-xs ml-1 font-bold">Save 20%</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 flex flex-col relative overflow-hidden hover-lift">
              <div className="mb-8">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-2">FREE</h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-display text-on-surface">$0</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">/month</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Perfect for trying out SnapCut AI features.
                </p>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-grow">
                {[
                  "Limited processing credits",
                  "Basic OCR capabilities",
                  "Collage Maker (Standard templates)",
                  "Standard resolution downloads",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Icon name="check" className="text-outline" />
                    <span className="font-body-md text-body-md text-on-surface">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={signedIn ? "/dashboard" : "/signup"}
                className="w-full py-3 rounded-lg font-label-md text-label-md border-2 border-primary text-primary hover:bg-surface-container-low text-center mt-auto"
              >
                {signedIn ? "Open Dashboard" : "Get Started"}
              </Link>
            </div>

            <div className="bg-primary-container text-on-primary-fixed border border-secondary rounded-xl p-6 sm:p-8 flex flex-col relative overflow-hidden lg:-translate-y-4 hover-lift">
              <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-4 py-1 rounded-bl-lg font-label-sm text-label-sm font-bold">
                POPULAR
              </div>
              <div className="mb-8 relative z-10">
                <h2 className="font-headline-md text-headline-md text-on-primary mb-2">PRO</h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-display text-on-primary">${proPrice}</span>
                  <span className="font-body-md text-body-md text-on-primary-container">
                    /month{yearly ? ", billed yearly" : ""}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-primary-container">
                  For professional creators and teams.
                </p>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-grow relative z-10">
                {[
                  "Unlimited processing credits",
                  "Advanced AI OCR (Multiple languages)",
                  "Premium Collage Templates",
                  "High-resolution 4K downloads",
                  "Priority batch processing",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Icon name="check_circle" className="text-secondary-fixed" />
                    <span className="font-body-md text-body-md text-on-primary">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  toast.message("Upgrade is demo-only for now. Payments will be connected later.")
                }
                className="w-full py-3 rounded-lg font-label-md text-label-md bg-secondary text-on-secondary hover:bg-secondary-container mt-auto relative z-10 btn-glow"
              >
                Upgrade
              </button>
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none" />
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Need custom limits for a large team?{" "}
              <a
                className="text-secondary font-medium hover:underline"
                href="mailto:sales@snapcut.ai"
              >
                Contact Sales
              </a>
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
