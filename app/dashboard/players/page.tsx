import { PageHeader } from "@/components/dashboard/page-header";
import { PlayerStep } from "@/components/dashboard/player-step";
import { PlayerProfiles } from "@/components/dashboard/player-profiles";

export default function PlayersStepPage() {
  return (
    <>
      <PageHeader
        eyebrow="Стъпка 3"
        title="Играчи"
        description="Реални Firebase профили и UID връзките им към отбори."
      />
      <div className="space-y-6"><PlayerProfiles /><PlayerStep /></div>
    </>
  );
}
