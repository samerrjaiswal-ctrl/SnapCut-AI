import { createFileRoute } from "@tanstack/react-router";
import { PdfOperationsView } from "@/components/snapcut/pdf-operations-view";

export const Route = createFileRoute("/pdf-to-pptx")({
  component: PdfToPptxPage,
  head: () => ({
    meta: [{ title: "PDF to PPTX | SnapCut AI" }],
  }),
});

function PdfToPptxPage() {
  return <PdfOperationsView initialMode="pptx" />;
}
