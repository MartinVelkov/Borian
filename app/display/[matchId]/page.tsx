import { ScoreboardDisplay } from "@/components/display/scoreboard-display";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ScoreboardDisplay matchId={matchId} />;
}
