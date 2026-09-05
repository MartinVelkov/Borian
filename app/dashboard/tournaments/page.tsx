import { CreateTournamentForm } from "@/components/dashboard/create-tournament-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default function TournamentsStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 1"
        title="Създай турнир"
        description="Първо създай турнира. След това в следващите стъпки ще избираш турнира по име, без да пишеш ID."
      />
      <CreateTournamentForm />
    </>
  );
}
