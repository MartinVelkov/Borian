import { PageHeader } from "@/components/dashboard/page-header";
import { SchedulePanel } from "@/components/dashboard/schedule-panel";

export default function ScheduleStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 4"
        title="Генерирай програма"
        description="Избери турнир по име и системата ще генерира всички мачове за формат всеки срещу всеки."
      />
      <SchedulePanel />
    </>
  );
}
