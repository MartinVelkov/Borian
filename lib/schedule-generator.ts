import type {
  ActiveKnockoutSize,
  Match,
  MatchSource,
  MatchSport,
  MatchStage,
  QualificationSlot,
  Team,
  TournamentPool,
} from "@/lib/types";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function assertValidScheduleSettings(params: {
  startTime: string;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
}) {
  const start = new Date(params.startTime);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Началният час е невалиден.");
  }

  if (!Number.isFinite(params.matchDuration) || params.matchDuration < 1) {
    throw new Error("Продължителността на мача трябва да е поне 1 минута.");
  }

  if (!Number.isFinite(params.breakDuration) || params.breakDuration < 0) {
    throw new Error("Почивката не може да бъде отрицателна.");
  }

  if (!Number.isInteger(params.fieldCount) || params.fieldCount < 1) {
    throw new Error("Трябва да има поне едно игрище.");
  }
}

function safeIdPart(value: string) {
  return value
    .trim()
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function matchId(...parts: Array<string | number>) {
  return parts.map((part) => safeIdPart(String(part))).join("__");
}

function createBaseMatch(params: {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  startTime: Date;
  matchDuration: number;
  fieldNumber: number;
  sport?: MatchSport;
}): Match {
  const now = new Date().toISOString();

  return {
    id: params.id,
    tournamentId: params.tournamentId,
    homeTeamId: params.homeTeamId,
    awayTeamId: params.awayTeamId,
    homeTeamName: params.homeTeamName,
    awayTeamName: params.awayTeamName,
    homeScore: 0,
    awayScore: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeTimeouts: 0,
    awayTimeouts: 0,
    field: `Игрище ${params.fieldNumber}`,
    startTime: params.startTime.toISOString(),
    endTime: addMinutes(params.startTime, params.matchDuration).toISOString(),
    status: "SCHEDULED",
    sport: params.sport ?? "FOOTBALL",
    currentHalf: 1,
    halfDurationSeconds: params.matchDuration * 60,
    timerRemainingSeconds: params.matchDuration * 60,
    timerState: "STOPPED",
    timerEndsAt: null,
    period: 1,
    possession: null,
    createdAt: now,
    updatedAt: now,
  };
}

/*
 * Circle-method round robin. Every team plays at most once in each round.
 */
export function createRoundRobinRounds(teams: Team[]): Array<Array<[Team, Team]>> {
  if (teams.length < 2) {
    return [];
  }

  const participants: Array<Team | null> = [...teams];

  if (participants.length % 2 !== 0) {
    participants.push(null);
  }

  const rounds: Array<Array<[Team, Team]>> = [];
  const totalRounds = participants.length - 1;
  const matchesPerRound = participants.length / 2;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const round: Array<[Team, Team]> = [];

    for (let pairingIndex = 0; pairingIndex < matchesPerRound; pairingIndex += 1) {
      const left = participants[pairingIndex];
      const right = participants[participants.length - 1 - pairingIndex];

      if (!left || !right) {
        continue;
      }

      const shouldSwap = (roundIndex + pairingIndex) % 2 === 1;
      round.push(shouldSwap ? [right, left] : [left, right]);
    }

    rounds.push(round);

    const fixed = participants[0];
    const rotating = participants.slice(1);
    const last = rotating.pop();

    if (last !== undefined) {
      rotating.unshift(last);
    }

    participants.splice(0, participants.length, fixed, ...rotating);
  }

  return rounds;
}

export function generateRoundRobinSchedule(params: {
  tournamentId: string;
  teams: Team[];
  startTime: string;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  sport?: MatchSport;
}): Match[] {
  assertValidScheduleSettings(params);

  if (params.teams.length < 2) {
    throw new Error("Добави поне два отбора.");
  }

  const rounds = createRoundRobinRounds(params.teams);
  const schedule: Match[] = [];
  let currentTime = new Date(params.startTime);

  rounds.forEach((round, roundIndex) => {
    for (let index = 0; index < round.length; index += params.fieldCount) {
      const wave = round.slice(index, index + params.fieldCount);

      wave.forEach(([home, away], fieldIndex) => {
        schedule.push({
          ...createBaseMatch({
            id: matchId(
              params.tournamentId,
              "round-robin",
              `round-${roundIndex + 1}`,
              home.id,
              away.id,
            ),
            tournamentId: params.tournamentId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            homeTeamName: home.name,
            awayTeamName: away.name,
            startTime: currentTime,
            matchDuration: params.matchDuration,
            fieldNumber: fieldIndex + 1,
            sport: params.sport,
          }),
          roundLabel: `Кръг ${roundIndex + 1}`,
        });
      });

      currentTime = addMinutes(
        currentTime,
        params.matchDuration + params.breakDuration,
      );
    }
  });

  return schedule;
}

export function generatePoolSchedule(params: {
  tournamentId: string;
  pools: TournamentPool[];
  startTime: string;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  sport?: MatchSport;
}): Match[] {
  assertValidScheduleSettings(params);

  if (params.pools.length < 1) {
    throw new Error("Създай поне една група.");
  }

  const poolRounds = params.pools.map((pool) => {
    if (pool.teams.length < 2) {
      throw new Error(`${pool.name} трябва да има поне два отбора.`);
    }

    return {
      pool,
      rounds: createRoundRobinRounds(pool.teams),
    };
  });

  const maximumRoundCount = Math.max(
    ...poolRounds.map(({ rounds }) => rounds.length),
  );

  const schedule: Match[] = [];
  let currentTime = new Date(params.startTime);

  for (let roundIndex = 0; roundIndex < maximumRoundCount; roundIndex += 1) {
    const roundMatches = poolRounds.flatMap(({ pool, rounds }) =>
      (rounds[roundIndex] ?? []).map(([home, away], pairingIndex) => ({
        pool,
        home,
        away,
        pairingIndex,
      })),
    );

    for (let index = 0; index < roundMatches.length; index += params.fieldCount) {
      const wave = roundMatches.slice(index, index + params.fieldCount);

      wave.forEach(({ pool, home, away, pairingIndex }, fieldIndex) => {
        schedule.push({
          ...createBaseMatch({
            id: matchId(
              params.tournamentId,
              "pool",
              pool.id,
              `round-${roundIndex + 1}`,
              `match-${pairingIndex + 1}`,
              home.id,
              away.id,
            ),
            tournamentId: params.tournamentId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            homeTeamName: home.name,
            awayTeamName: away.name,
            startTime: currentTime,
            matchDuration: params.matchDuration,
            fieldNumber: fieldIndex + 1,
            sport: params.sport,
          }),
          stage: "POOL",
          roundLabel: `${pool.name} — кръг ${roundIndex + 1}`,
          poolId: pool.id,
          poolName: pool.name,
          poolRound: roundIndex + 1,
        });
      });

      currentTime = addMinutes(
        currentTime,
        params.matchDuration + params.breakDuration,
      );
    }
  }

  return schedule;
}

export function firstKnockoutStage(size: ActiveKnockoutSize): MatchStage {
  switch (size) {
    case 16:
      return "ROUND_OF_16";
    case 8:
      return "QUARTER_FINAL";
    case 4:
      return "SEMI_FINAL";
    case 2:
      return "FINAL";
  }
}

export function stageLabel(stage: MatchStage) {
  switch (stage) {
    case "POOL":
      return "Групова фаза";
    case "ROUND_OF_16":
      return "Осминафинал";
    case "QUARTER_FINAL":
      return "Четвъртфинал";
    case "SEMI_FINAL":
      return "Полуфинал";
    case "THIRD_PLACE":
      return "Мач за трето място";
    case "FINAL":
      return "Финал";
  }
}

function nextKnockoutStage(stage: MatchStage): MatchStage | null {
  switch (stage) {
    case "ROUND_OF_16":
      return "QUARTER_FINAL";
    case "QUARTER_FINAL":
      return "SEMI_FINAL";
    case "SEMI_FINAL":
      return "FINAL";
    default:
      return null;
  }
}

function sourceDisplay(source: MatchSource): {
  teamId: string;
  teamName: string;
} {
  if (source.type === "TEAM") {
    return {
      teamId: source.teamId,
      teamName: source.teamName,
    };
  }

  return {
    teamId: "",
    teamName: source.label,
  };
}

function createKnockoutMatch(params: {
  tournamentId: string;
  stage: MatchStage;
  bracketOrder: number;
  homeSource: MatchSource;
  awaySource: MatchSource;
  startTime: Date;
  matchDuration: number;
  fieldNumber: number;
  sport?: MatchSport;
  categoryId?: string;
}): Match {
  const home = sourceDisplay(params.homeSource);
  const away = sourceDisplay(params.awaySource);
  const label = stageLabel(params.stage);

  return {
    ...createBaseMatch({
      id: matchId(
        params.tournamentId,
        params.stage.toLowerCase(),
        params.bracketOrder + 1,
      ),
      tournamentId: params.tournamentId,
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeTeamName: home.teamName,
      awayTeamName: away.teamName,
      startTime: params.startTime,
      matchDuration: params.matchDuration,
      fieldNumber: params.fieldNumber,
      sport: params.sport,
    }),
    stage: params.stage,
    roundLabel:
      params.stage === "FINAL" || params.stage === "THIRD_PLACE"
        ? label
        : `${label} ${params.bracketOrder + 1}`,
    bracketOrder: params.bracketOrder,
    homeSource: params.homeSource,
    awaySource: params.awaySource,
    categoryId: params.categoryId,
  };
}

function scheduleKnockoutRound(params: {
  tournamentId: string;
  stage: MatchStage;
  pairings: Array<[MatchSource, MatchSource]>;
  startTime: Date;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  sport?: MatchSport;
  categoryId?: string;
}): { matches: Match[]; nextStartTime: Date } {
  const matches: Match[] = [];
  let currentTime = new Date(params.startTime);

  for (let index = 0; index < params.pairings.length; index += params.fieldCount) {
    const wave = params.pairings.slice(index, index + params.fieldCount);

    wave.forEach(([homeSource, awaySource], fieldIndex) => {
      matches.push(
        createKnockoutMatch({
          tournamentId: params.tournamentId,
          stage: params.stage,
          bracketOrder: index + fieldIndex,
          homeSource,
          awaySource,
          startTime: currentTime,
          matchDuration: params.matchDuration,
          fieldNumber: fieldIndex + 1,
          sport: params.sport,
          categoryId: params.categoryId,
        }),
      );
    });

    currentTime = addMinutes(
      currentTime,
      params.matchDuration + params.breakDuration,
    );
  }

  return {
    matches,
    nextStartTime: currentTime,
  };
}

export function generateKnockoutSchedule(params: {
  tournamentId: string;
  knockoutSize: ActiveKnockoutSize;
  qualificationSlots: QualificationSlot[];
  startTime: string;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  includeThirdPlaceMatch?: boolean;
  sport?: MatchSport;
  categoryId?: string;
}): Match[] {
  assertValidScheduleSettings(params);

  if (params.qualificationSlots.length !== params.knockoutSize) {
    throw new Error(
      `За схема с ${params.knockoutSize} отбора трябва да има точно ${params.knockoutSize} избрани позиции.`,
    );
  }

  const orderedSlots = [...params.qualificationSlots].sort(
    (first, second) => first.slot - second.slot,
  );

  const uniqueSlots = new Set(orderedSlots.map((slot) => slot.slot));

  if (uniqueSlots.size !== params.knockoutSize) {
    throw new Error("Има повтарящи се позиции в елиминационната схема.");
  }

  const firstPairings: Array<[MatchSource, MatchSource]> = [];

  for (let index = 0; index < orderedSlots.length; index += 2) {
    const home = orderedSlots[index]?.source;
    const away = orderedSlots[index + 1]?.source;

    if (!home || !away) {
      throw new Error("Елиминиционната схема съдържа непълен мач.");
    }

    firstPairings.push([home, away]);
  }

  const allMatches: Match[] = [];
  let stage = firstKnockoutStage(params.knockoutSize);
  let roundStartTime = new Date(params.startTime);

  let currentRound = scheduleKnockoutRound({
    tournamentId: params.tournamentId,
    stage,
    pairings: firstPairings,
    startTime: roundStartTime,
    matchDuration: params.matchDuration,
    breakDuration: params.breakDuration,
    fieldCount: params.fieldCount,
    sport: params.sport,
    categoryId: params.categoryId,
  });

  allMatches.push(...currentRound.matches);
  roundStartTime = currentRound.nextStartTime;

  while (stage !== "FINAL") {
    const upcomingStage = nextKnockoutStage(stage);

    if (!upcomingStage) {
      break;
    }

    const winnerSources = currentRound.matches.map<MatchSource>((match) => ({
      type: "MATCH_WINNER",
      matchId: match.id,
      label: `Победител от ${match.roundLabel ?? "предишния мач"}`,
    }));

    const nextPairings: Array<[MatchSource, MatchSource]> = [];

    for (let index = 0; index < winnerSources.length; index += 2) {
      const home = winnerSources[index];
      const away = winnerSources[index + 1];

      if (home && away) {
        nextPairings.push([home, away]);
      }
    }

    const previousStage = stage;
    stage = upcomingStage;

    if (
      previousStage === "SEMI_FINAL" &&
      stage === "FINAL" &&
      currentRound.matches.length === 2
    ) {
      let finalStartTime = new Date(roundStartTime);
      let finalFieldNumber = 1;

      if (params.includeThirdPlaceMatch) {
        const thirdPlace = createKnockoutMatch({
          tournamentId: params.tournamentId,
          stage: "THIRD_PLACE",
          bracketOrder: 0,
          homeSource: {
            type: "MATCH_LOSER",
            matchId: currentRound.matches[0].id,
            label: "Загубил от полуфинал 1",
          },
          awaySource: {
            type: "MATCH_LOSER",
            matchId: currentRound.matches[1].id,
            label: "Загубил от полуфинал 2",
          },
          startTime: roundStartTime,
          matchDuration: params.matchDuration,
          fieldNumber: 1,
          sport: params.sport,
          categoryId: params.categoryId,
        });

        allMatches.push(thirdPlace);

        if (params.fieldCount > 1) {
          finalFieldNumber = 2;
        } else {
          finalStartTime = addMinutes(
            roundStartTime,
            params.matchDuration + params.breakDuration,
          );
        }
      }

      const finalPairing = nextPairings[0];

      if (!finalPairing) {
        throw new Error("Не може да бъде създаден финалният мач.");
      }

      const finalMatch = createKnockoutMatch({
        tournamentId: params.tournamentId,
        stage: "FINAL",
        bracketOrder: 0,
        homeSource: finalPairing[0],
        awaySource: finalPairing[1],
        startTime: finalStartTime,
        matchDuration: params.matchDuration,
        fieldNumber: finalFieldNumber,
        sport: params.sport,
        categoryId: params.categoryId,
      });

      allMatches.push(finalMatch);
      currentRound = {
        matches: [finalMatch],
        nextStartTime: addMinutes(
          finalStartTime,
          params.matchDuration + params.breakDuration,
        ),
      };
      roundStartTime = currentRound.nextStartTime;
      continue;
    }

    const nextRound = scheduleKnockoutRound({
      tournamentId: params.tournamentId,
      stage,
      pairings: nextPairings,
      startTime: roundStartTime,
      matchDuration: params.matchDuration,
      breakDuration: params.breakDuration,
      fieldCount: params.fieldCount,
      sport: params.sport,
      categoryId: params.categoryId,
    });

    allMatches.push(...nextRound.matches);
    currentRound = nextRound;
    roundStartTime = nextRound.nextStartTime;
  }

  return allMatches;
}