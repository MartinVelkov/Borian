import { BracketViewerPanel } from "@/components/tournament/bracket-viewer-panel";
import { PageHeader } from "@/components/dashboard/page-header";

export default function TournamentsStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 6"
        title="Схема на турнира"
        description="Гледай турнира"
      />
      <BracketViewerPanel />
    </>
  );
}
