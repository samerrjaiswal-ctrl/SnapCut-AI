import { createFileRoute } from "@tanstack/react-router";
import { ToolPlaceholderPage } from "@/components/snapcut/tool-placeholder-page";

export const Route = createFileRoute("/ai-productivity/resume-analyzer")({
  component: Page,
  head: () => ({ meta: [{ title: "Resume Analyzer | SnapCut AI" }] }),
});

function Page() {
  return (
    <ToolPlaceholderPage
      title="Resume Analyzer"
      description="Analyze resumes, identify skills and get actionable improvement suggestions."
      crumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "AI Productivity", to: "/ai-productivity" },
        { label: "Resume Analyzer" },
      ]}
      kind="pdf"
      accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      uploadLabel="Upload a resume (PDF or DOCX)"
      actionLabel="Analyze Resume"
      processingMessage="Analyzing resume…"
    />
  );
}
