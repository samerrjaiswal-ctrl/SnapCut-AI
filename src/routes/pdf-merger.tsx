import { createFileRoute } from "@tanstack/react-router";
import { PdfOperationsView } from "@/components/snapcut/pdf-operations-view";

export const Route = createFileRoute("/pdf-merger")({
  component: PdfMergerPage,
  head: () => ({
    meta: [{ title: "PDF Merger | SnapCut AI" }],
  }),
});

function PdfMergerPage() {
  return <PdfOperationsView initialMode="merger" />;
}
