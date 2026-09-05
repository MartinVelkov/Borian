import { PageHeader } from "@/components/dashboard/page-header";
import { TeamStep } from "@/components/dashboard/team-step";

export default function TeamsStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 2"
        title="Добави отбори"
        description="Избери турнир по име и създай отборите, които ще участват."
      />
      <TeamStep />
    </>
  );
}
