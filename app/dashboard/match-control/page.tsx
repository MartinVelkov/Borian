import { PageHeader } from "@/components/dashboard/page-header";
import { MatchControlPanel } from "@/components/dashboard/match-control-panel";

export default function MatchControlStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 5"
        title="Контролен панел за мач"
        description="Избери мач от програмата. Оттук управляваш голове, фалове и корнери, а бутонът за зрителски екран отваря нов прозорец."
      />
      <MatchControlPanel />
    </>
  );
}
