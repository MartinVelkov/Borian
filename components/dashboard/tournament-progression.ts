import type {
  CompetitionFormat,
  Match,
  MatchSource,
  PoolRankingRule,
  PoolStanding,
  PoolStandings,
  Team,
  TournamentPool,
} from "@/lib/types";

function safeScore(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function defaultRankingRules(): PoolRankingRule[] {
  return [
    "POINTS",
    "SCORE_DIFFERENCE",
    "SCORED",
    "WINS",
    "HEAD_TO_HEAD",
    "ALPHABETICAL",
  ];
}

function headToHeadDifference(
  firstTeamId: string,
  secondTeamId: string,
  poolMatches: Match[],
) {
  const directMatches = poolMatches.filter(
    (match) =>
      match.status === "FINISHED" &&
      ((match.homeTeamId === firstTeamId && match.awayTeamId === secondTeamId) ||
        (match.homeTeamId === secondTeamId && match.awayTeamId === firstTeamId)),
  );

  let firstDifference = 0;

  for (const match of directMatches) {
    const homeScore = safeScore(match.homeScore);
    const awayScore = safeScore(match.awayScore);

    if (match.homeTeamId === firstTeamId) {
      firstDifference += homeScore - awayScore;
    } else {
      firstDifference += awayScore - homeScore;
    }
  }

  return firstDifference;
}

export function calculatePoolStandings(params: {
  pool: TournamentPool;
  matches: Match[];
  rankingRules?: PoolRankingRule[];
}): PoolStandings {
  const { pool } = params;
  const poolMatches = params.matches.filter(
    (match) => match.stage === "POOL" && match.poolId === pool.id,
  );

  const standingsByTeam = new Map<string, PoolStanding>();

  for (const team of pool.teams) {
    standingsByTeam.set(team.id, {
      poolId: pool.id,
      poolName: pool.name,
      position: 0,
      teamId: team.id,
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

  for (const match of poolMatches) {
    if (match.status !== "FINISHED") {
      continue;
    }

    const homeStanding = standingsByTeam.get(match.homeTeamId);
    const awayStanding = standingsByTeam.get(match.awayTeamId);

    if (!homeStanding || !awayStanding) {
      continue;
    }

    const homeScore = safeScore(match.homeScore);
    const awayScore = safeScore(match.awayScore);

    homeStanding.played += 1;
    awayStanding.played += 1;

    homeStanding.scored += homeScore;
    homeStanding.conceded += awayScore;
    awayStanding.scored += awayScore;
    awayStanding.conceded += homeScore;

    if (homeScore > awayScore) {
      homeStanding.wins += 1;
      homeStanding.points += 3;
      awayStanding.losses += 1;
    } else if (awayScore > homeScore) {
      awayStanding.wins += 1;
      awayStanding.points += 3;
      homeStanding.losses += 1;
    } else {
      homeStanding.draws += 1;
      awayStanding.draws += 1;
      homeStanding.points += 1;
      awayStanding.points += 1;
    }
  }

  const rankingRules =
    params.rankingRules && params.rankingRules.length > 0
      ? params.rankingRules
      : defaultRankingRules();

  const standings = [...standingsByTeam.values()].map((standing) => ({
    ...standing,
    difference: standing.scored - standing.conceded,
  }));

  standings.sort((first, second) => {
    for (const rule of rankingRules) {
      let difference = 0;

      switch (rule) {
        case "POINTS":
          difference = second.points - first.points;
          break;
        case "SCORE_DIFFERENCE":
          difference = second.difference - first.difference;
          break;
        case "SCORED":
          difference = second.scored - first.scored;
          break;
        case "WINS":
          difference = second.wins - first.wins;
          break;
        case "HEAD_TO_HEAD":
          difference = -headToHeadDifference(
            first.teamId,
            second.teamId,
            poolMatches,
          );
          break;
        case "ALPHABETICAL":
          difference = first.teamName.localeCompare(second.teamName, "bg");
          break;
      }

      if (difference !== 0) {
        return difference;
      }
    }

    return first.teamName.localeCompare(second.teamName, "bg");
  });

  const rankedStandings = standings.map((standing, index) => ({
    ...standing,
    position: index + 1,
  }));

  const completed =
    poolMatches.length > 0 &&
    poolMatches.every(
      (match) =>
        match.status === "FINISHED" || match.status === "CANCELLED",
    );

  return {
    poolId: pool.id,
    poolName: pool.name,
    completed,
    standings: rankedStandings,
  };
}

export function calculateAllPoolStandings(params: {
  format: CompetitionFormat;
  matches: Match[];
}) {
  return new Map(
    params.format.pools.map((pool) => {
      const result = calculatePoolStandings({
        pool,
        matches: params.matches,
        rankingRules: params.format.rankingRules,
      });

      return [pool.id, result] as const;
    }),
  );
}


function playedDivisor(standing: PoolStanding) {
  return Math.max(1, standing.played);
}

/*
 * Cross-group ranking is normalized per played match so a runner-up from a
 * four-team group does not receive an automatic advantage over a runner-up
 * from a three-team group simply because they played one extra game.
 */
function compareCrossPoolStandings(
  first: PoolStanding,
  second: PoolStanding,
) {
  const firstPlayed = playedDivisor(first);
  const secondPlayed = playedDivisor(second);

  const comparisons = [
    second.points / secondPlayed - first.points / firstPlayed,
    second.difference / secondPlayed - first.difference / firstPlayed,
    second.scored / secondPlayed - first.scored / firstPlayed,
    second.wins / secondPlayed - first.wins / firstPlayed,
    second.points - first.points,
    second.difference - first.difference,
    second.scored - first.scored,
  ];

  for (const difference of comparisons) {
    if (Math.abs(difference) > Number.EPSILON) {
      return difference;
    }
  }

  return first.teamName.localeCompare(second.teamName, "bg");
}

function finishedMatchResult(match: Match): {
  winnerId: string;
  loserId: string;
} | null {
  if (match.status !== "FINISHED") {
    return null;
  }

  const homeScore = safeScore(match.homeScore);
  const awayScore = safeScore(match.awayScore);

  if (homeScore === awayScore) {
    return null;
  }

  return homeScore > awayScore
    ? {
        winnerId: match.homeTeamId,
        loserId: match.awayTeamId,
      }
    : {
        winnerId: match.awayTeamId,
        loserId: match.homeTeamId,
      };
}

export function resolveMatchSource(params: {
  source?: MatchSource;
  teams: Team[];
  matches: Match[];
  format?: CompetitionFormat;
}): Team | null {
  const { source } = params;

  if (!source) {
    return null;
  }

  const teamsById = new Map(params.teams.map((team) => [team.id, team]));

  if (source.type === "TEAM") {
    return teamsById.get(source.teamId) ?? null;
  }

  if (source.type === "POOL_POSITION") {
    if (!params.format) {
      return null;
    }

    const pool = params.format.pools.find(
      (currentPool) => currentPool.id === source.poolId,
    );

    if (!pool) {
      return null;
    }

    const poolStandings = calculatePoolStandings({
      pool,
      matches: params.matches,
      rankingRules: params.format.rankingRules,
    });

    if (!poolStandings.completed) {
      return null;
    }

    const standing = poolStandings.standings[source.position - 1];

    return standing ? teamsById.get(standing.teamId) ?? null : null;
  }

  if (source.type === "BEST_POOL_POSITION") {
    if (!params.format) {
      return null;
    }

    const allowedPoolIds = source.poolIds
      ? new Set(source.poolIds)
      : null;
    const selectedPools = params.format.pools.filter(
      (pool) => !allowedPoolIds || allowedPoolIds.has(pool.id),
    );

    const standings = selectedPools.map((pool) =>
      calculatePoolStandings({
        pool,
        matches: params.matches,
        rankingRules: params.format?.rankingRules,
      }),
    );

    if (
      standings.length === 0 ||
      standings.some((poolStandings) => !poolStandings.completed)
    ) {
      return null;
    }

    const candidates = standings
      .map(
        (poolStandings) =>
          poolStandings.standings[source.position - 1],
      )
      .filter((standing): standing is PoolStanding => Boolean(standing))
      .sort(compareCrossPoolStandings);

    const selectedStanding = candidates[source.rank - 1];

    return selectedStanding
      ? teamsById.get(selectedStanding.teamId) ?? null
      : null;
  }

  const sourceMatch = params.matches.find(
    (match) => match.id === source.matchId,
  );

  if (!sourceMatch) {
    return null;
  }

  const result = finishedMatchResult(sourceMatch);

  if (!result) {
    return null;
  }

  const teamId =
    source.type === "MATCH_WINNER" ? result.winnerId : result.loserId;

  return teamsById.get(teamId) ?? null;
}

export function resolveMatchParticipants(params: {
  match: Match;
  teams: Team[];
  matches: Match[];
  format?: CompetitionFormat;
}): Partial<Match> | null {
  if (params.match.status !== "SCHEDULED") {
    return null;
  }

  const homeTeam = resolveMatchSource({
    source: params.match.homeSource,
    teams: params.teams,
    matches: params.matches,
    format: params.format,
  });

  const awayTeam = resolveMatchSource({
    source: params.match.awaySource,
    teams: params.teams,
    matches: params.matches,
    format: params.format,
  });

  const updates: Partial<Match> = {};

  if (
    homeTeam &&
    (params.match.homeTeamId !== homeTeam.id ||
      params.match.homeTeamName !== homeTeam.name)
  ) {
    updates.homeTeamId = homeTeam.id;
    updates.homeTeamName = homeTeam.name;
  }

  if (
    awayTeam &&
    (params.match.awayTeamId !== awayTeam.id ||
      params.match.awayTeamName !== awayTeam.name)
  ) {
    updates.awayTeamId = awayTeam.id;
    updates.awayTeamName = awayTeam.name;
  }

  const resolvedHomeId = homeTeam?.id ?? params.match.homeTeamId;
  const resolvedAwayId = awayTeam?.id ?? params.match.awayTeamId;

  if (resolvedHomeId && resolvedAwayId && resolvedHomeId === resolvedAwayId) {
    throw new Error(
      `Отборът „${homeTeam?.name ?? params.match.homeTeamName}“ е поставен и от двете страни на ${params.match.roundLabel ?? "елиминационен мач"}.`,
    );
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

export function isKnockoutMatch(match: Match) {
  return Boolean(match.stage && match.stage !== "POOL");
}

export function canFinishMatch(match: Match) {
  if (!isKnockoutMatch(match)) {
    return true;
  }

  return safeScore(match.homeScore) !== safeScore(match.awayScore);
}