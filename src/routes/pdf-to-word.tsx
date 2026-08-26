import { createFileRoute } from "@tanstack/react-router";
import { PdfOperationsView } from "@/components/snapcut/pdf-operations-view";

export const Route = createFileRoute("/pdf-to-word")({
  component: PdfToWordPage,
  head: () => ({
    meta: [{ title: "PDF to Word | SnapCut AI" }],
  }),
});

function PdfToWordPage() {
  return <PdfOperationsView initialMode="word" />;
}
