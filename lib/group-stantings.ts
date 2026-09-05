import type {
  Match,
  QualificationSlot,
  Team,
  TournamentGroup,
} from "@/lib/types";

export interface GroupStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  difference: number;
  points: number;
}

export function calculateGroupStandings(
  group: TournamentGroup,
  teams: Team[],
  matches: Match[],
): GroupStanding[] {
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const standings = new Map<string, GroupStanding>();

  for (const teamId of group.teamIds) {
    const team = teamMap.get(teamId);

    if (!team) {
      continue;
    }

    standings.set(teamId, {
      teamId,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scored: 0,
      conceded: 0,
      difference: 0,
      points: 0,
    });
  }

  const finishedMatches = matches.filter(
    (match) =>
      match.phase === "GROUP" &&
      match.groupId === group.id &&
      match.status === "FINISHED",
  );

  for (const match of finishedMatches) {
    const home = standings.get(match.homeTeamId);
    const away = standings.get(match.awayTeamId);

    if (!home || !away) {
      continue;
    }

    const homeScore = Number(match.homeScore ?? 0);
    const awayScore = Number(match.awayScore ?? 0);

    home.played += 1;
    away.played += 1;

    home.scored += homeScore;
    home.conceded += awayScore;

    away.scored += awayScore;
    away.conceded += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...standings.values()]
    .map((standing) => ({
      ...standing,
      difference: standing.scored - standing.conceded,
    }))
    .sort((first, second) => {
      return (
        second.points - first.points ||
        second.difference - first.difference ||
        second.scored - first.scored ||
        second.wins - first.wins ||
        first.teamName.localeCompare(second.teamName, "bg")
      );
    });
}

interface ResolveQualificationInput {
  slots: QualificationSlot[];
  groups: TournamentGroup[];
  teams: Team[];
  matches: Match[];
}

export function resolveQualifiedTeams({
  slots,
  groups,
  teams,
  matches,
}: ResolveQualificationInput): Team[] {
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const standingsMap = new Map(
    groups.map((group) => [
      group.id,
      calculateGroupStandings(group, teams, matches),
    ]),
  );

  const qualifiedTeams = slots
    .sort((first, second) => first.slot - second.slot)
    .map((slot) => {
      if (slot.source.type === "TEAM") {
        const selectedTeam = teamMap.get(slot.source.teamId);

        if (!selectedTeam) {
          throw new Error(`Не е намерен ръчно избраният отбор.`);
        }

        return selectedTeam;
      }

      if (slot.source.type !== "POOL_POSITION") {
        throw new Error("Този legacy формат поддържа само позиция в група.");
      }

      const standings = standingsMap.get(slot.source.poolId);

      if (!standings) {
        throw new Error("Не е намерено класирането на избраната група.");
      }

      const selectedStanding = standings[slot.source.position - 1];

      if (!selectedStanding) {
        throw new Error(
          `В избраната група няма ${slot.source.position}-о място.`,
        );
      }

      const selectedTeam = teamMap.get(selectedStanding.teamId);

      if (!selectedTeam) {
        throw new Error("Класираният отбор не е намерен.");
      }

      return selectedTeam;
    });

  const uniqueTeamIds = new Set(qualifiedTeams.map((team) => team.id));

  if (uniqueTeamIds.size !== qualifiedTeams.length) {
    throw new Error(
      "Един и същ отбор е избран повече от веднъж за елиминациите.",
    );
  }

  return qualifiedTeams;
}
