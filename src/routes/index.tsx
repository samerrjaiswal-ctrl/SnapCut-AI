import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/snapcut/icon";
import { MarketingFooter, MarketingHeader } from "@/components/layout/marketing-shell";
import { SmoothText } from "@/components/snapcut/smooth-text";
import { stitchImages } from "@/data/assets";
import { useAuth } from "@/components/providers/auth-provider";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [{ title: "SnapCut AI - Powerful Image Tools. Simple Workflow." }],
  }),
});

const TOOLS = [
  {
    to: "/remove-text",
    icon: "ink_eraser",
    title: "Remove Text",
    description:
      "Intelligently erase text from any image while perfectly reconstructing the background using advanced AI.",
  },
  {
    to: "/image-to-text",
    icon: "article",
    title: "Image to Text (OCR)",
    description:
      "Instantly extract editable text from screenshots, documents, and photos with near-perfect accuracy.",
  },
  {
    to: "/collage-maker",
    icon: "dashboard_customize",
    title: "Collage Maker",
    description:
      "Assemble pixel-perfect collages with a rigid grid system designed for structural clarity and professional output.",
  },
] as const;

function useFontsReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof document === "undefined") return;
    if (document.fonts.status === "loaded") {
      markReady();
      return;
    }
    void document.fonts.ready.then(markReady);
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

function LandingPage() {
  const { session, mfaPending } = useAuth();
  const signedIn = Boolean(session) && !mfaPending;
  const fontsReady = useFontsReady();

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen flex flex-col">
      <MarketingHeader active="home" />
      <main className="flex-grow w-full max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop">
        <section className="py-24 md:py-32 flex flex-col items-center text-center gap-8">
          <div className="max-w-3xl space-y-6">
            <h1 className="font-display text-display text-primary tracking-tight">
              <SmoothText
                text="Powerful Image Tools."
                className="block"
                as="span"
                animate={fontsReady}
              />
              <br className="hidden md:block" />
              <SmoothText
                text="Simple Workflow."
                className="block"
                as="span"
                delayMs={120}
                animate={fontsReady}
              />
            </h1>
            <p
              className={`font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto ${
                fontsReady ? "animate-text-smooth delay-4" : "opacity-0"
              }`}
            >
              Remove text from images, extract text with OCR, and create beautiful collages — all in
              one simple workspace. Engineered for professional creators and enterprise teams.
            </p>
            <div
              className={`flex flex-col sm:flex-row justify-center gap-4 pt-4 ${
                fontsReady ? "animate-scale-in delay-5" : "opacity-0"
              }`}
            >
              {signedIn ? (
                <Link
                  to="/dashboard"
                  viewTransition
                  className="bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant px-6 py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 btn-glow"
                >
                  Open Dashboard
                  <Icon name="arrow_forward" size={18} />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  viewTransition
                  className="bg-primary-container text-on-primary hover:bg-on-primary-fixed-variant px-6 py-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 btn-glow"
                >
                  Get Started Free
                  <Icon name="arrow_forward" size={18} />
                </Link>
              )}
              <a
                href="#features"
                className="bg-surface-variant text-on-surface hover:bg-surface-container-highest px-6 py-3 rounded-lg border border-outline-variant font-label-md text-label-md"
              >
                Explore Tools
              </a>
            </div>
          </div>
          <div className="w-full max-w-5xl mt-12 relative rounded-xl border border-outline-variant bg-surface p-2 overflow-hidden aspect-video hover-lift animate-scale-in delay-5">
            <img
              className="w-full h-full object-cover rounded-lg border border-outline-variant"
              alt="SnapCut AI workspace preview showing image tools in a clean professional interface"
              src={stitchImages.hero}
            />
          </div>
        </section>

        <section className="py-24 border-t border-outline-variant" id="features">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight mb-4 animate-text-smooth">
              A Complete Professional Toolkit
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Everything you need to manipulate image text and layouts effortlessly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {TOOLS.map((tool) =>
              signedIn ? (
                <Link
                  key={tool.to}
                  to={tool.to}
                  preload="intent"
                  className="bg-surface rounded-xl border border-outline-variant p-8 flex flex-col gap-6 hover-lift text-left active:scale-[0.99]"
                >
                  <ToolCardBody tool={tool} />
                </Link>
              ) : (
                <div
                  key={tool.to}
                  className="bg-surface rounded-xl border border-outline-variant p-8 flex flex-col gap-6 text-left opacity-80"
                >
                  <ToolCardBody tool={tool} locked />
                </div>
              ),
            )}
          </div>
        </section>

        <section className="py-24 border-t border-outline-variant bg-surface-bright rounded-2xl p-8 md:p-16 my-16">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight mb-4">
              Seamless Workflow
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Process images in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-outline-variant z-0" />
            {[
              { step: "1", title: "Upload", body: "Drag and drop your image into the workspace." },
              {
                step: "2",
                title: "Process",
                body: "Select a tool and let AI handle the heavy lifting instantly.",
              },
              {
                step: "3",
                title: "Export",
                body: "Download your high-resolution result immediately.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center gap-4 relative z-10 hover-lift"
              >
                <div className="w-16 h-16 bg-primary-container text-on-primary-fixed rounded-full flex items-center justify-center font-headline-md text-headline-md font-bold border-4 border-surface-bright">
                  {item.step}
                </div>
                <h4 className="font-headline-md text-headline-md text-primary">{item.title}</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function ToolCardBody({ tool, locked }: { tool: (typeof TOOLS)[number]; locked?: boolean }) {
  return (
    <>
      <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center border border-outline-variant">
        <Icon name={tool.icon} filled className="text-secondary" />
      </div>
      <div>
        <h3 className="font-headline-md text-headline-md text-primary mb-2">{tool.title}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">{tool.description}</p>
        {locked ? (
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-3">
            Sign in to use this tool.
          </p>
        ) : null}
      </div>
    </>
  );
}
