"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  GitBranch,
  Loader2,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  TournamentBracketPlanPreview,
  TournamentBracketView,
} from "@/components/tournament/tournament-bracket-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getMatches,
  getTeams,
  getTournaments,
  getCategories,
  replaceTournamentSchedule,
  resolveTournamentProgression,
  saveCompetitionFormat,
  saveTournamentFormat,
} from "@/lib/firestore-service";
import {
  generateKnockoutSchedule,
  generatePoolSchedule,
  generateRoundRobinSchedule,
} from "@/lib/schedule-generator";
import { calculateRoundRobinStandings } from "@/lib/tournament-progression";
import type {
  ActiveKnockoutSize,
  Category,
  CompetitionFormat,
  KnockoutSize,
  Match,
  PoolSeedingMode,
  QualificationSlot,
  QualificationSource,
  Team,
  Tournament,
  TournamentFormat,
  TournamentPool,
} from "@/lib/types";

const formatLabels: Record<
  Exclude<TournamentFormat, "CUSTOM">,
  string
> = {
  ROUND_ROBIN: "Всеки срещу всеки",
  GROUP_KNOCKOUT: "Групи + елиминации",
};


type RecommendedTournamentPlan = {
  teamCount: number;
  poolSizes: number[];
  knockoutSize: KnockoutSize;
  includeThirdPlaceMatch: boolean;
  usesBestRunnerUp: boolean;
  explanation: string;
};

const hardcodedPlans: Record<number, Omit<RecommendedTournamentPlan, "teamCount">> = {
  2: {
    poolSizes: [2],
    knockoutSize: 2,
    includeThirdPlaceMatch: false,
    usesBestRunnerUp: false,
    explanation: "Една група и финал между първите два отбора.",
  },
  3: {
    poolSizes: [3],
    knockoutSize: 2,
    includeThirdPlaceMatch: false,
    usesBestRunnerUp: false,
    explanation: "Една група от 3 отбора; първите два играят финал.",
  },
  4: {
    poolSizes: [4],
    knockoutSize: 2,
    includeThirdPlaceMatch: false,
    usesBestRunnerUp: false,
    explanation: "Една група от 4 отбора; първите два играят финал.",
  },
  5: {
    poolSizes: [3, 2],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Две максимално балансирани групи; първите два от всяка продължават.",
  },
  6: {
    poolSizes: [3, 3],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Две групи по 3; първите два от всяка продължават.",
  },
  7: {
    poolSizes: [4, 3],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Две балансирани групи от 4 и 3; първите два продължават.",
  },
  8: {
    poolSizes: [4, 4],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Две групи по 4; първите два от всяка продължават.",
  },
  9: {
    poolSizes: [3, 3, 3],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: true,
    explanation: "Три групи по 3; победителите и най-добрият втори продължават.",
  },
  10: {
    poolSizes: [4, 3, 3],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: true,
    explanation: "Три балансирани групи; победителите и най-добрият втори продължават.",
  },
  11: {
    poolSizes: [4, 4, 3],
    knockoutSize: 4,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: true,
    explanation: "Три балансирани групи; победителите и най-добрият втори продължават.",
  },
  12: {
    poolSizes: [3, 3, 3, 3],
    knockoutSize: 8,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Четири групи по 3; първите два от всяка продължават.",
  },
  13: {
    poolSizes: [4, 3, 3, 3],
    knockoutSize: 8,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Четири балансирани групи; първите два от всяка продължават.",
  },
  14: {
    poolSizes: [4, 4, 3, 3],
    knockoutSize: 8,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Четири балансирани групи; първите два от всяка продължават.",
  },
  15: {
    poolSizes: [4, 4, 4, 3],
    knockoutSize: 8,
    includeThirdPlaceMatch: true,
    usesBestRunnerUp: false,
    explanation: "Четири балансирани групи; първите два от всяка продължават.",
  },
};

function recommendedTournamentPlan(
  teamCount: number,
): RecommendedTournamentPlan | null {
  const plan = hardcodedPlans[teamCount];

  return plan ? { teamCount, ...plan } : null;
}

function toDateTimeLocal(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function addMinutes(value: string, minutes: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateTimeLocal(
    new Date(date.getTime() + minutes * 60_000).toISOString(),
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Без зададен час";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function poolId(index: number) {
  return `pool-${String.fromCharCode(97 + index)}`;
}

function poolName(index: number) {
  return `Група ${String.fromCharCode(65 + index)}`;
}

function poolIds(count: number) {
  return Array.from({ length: count }, (_, index) => poolId(index));
}


function sourceValueForBestPoolPosition(position: number, rank = 1) {
  return `BEST_POOL_POSITION|${position}|${rank}`;
}

function distributeTeamsByPoolSizes(
  teams: Team[],
  sizes: number[],
  mode: PoolSeedingMode,
) {
  const ids = poolIds(sizes.length);
  const orderedTeams = sortTeamsForSeeding(teams, mode);
  const assignments: Record<string, string> = {};
  const remaining = [...sizes];
  const forward = ids.map((_, index) => index);
  const backward = [...forward].reverse();
  const snakeOrder = [...forward, ...backward];
  let cursor = 0;

  for (const team of orderedTeams) {
    let assigned = false;

    for (let attempt = 0; attempt < snakeOrder.length * 2; attempt += 1) {
      const poolIndex =
        mode === "SNAKE"
          ? snakeOrder[cursor % snakeOrder.length]
          : cursor % ids.length;
      cursor += 1;

      if (remaining[poolIndex] <= 0) {
        continue;
      }

      assignments[team.id] = ids[poolIndex];
      remaining[poolIndex] -= 1;
      assigned = true;
      break;
    }

    if (!assigned) {
      throw new Error("Не може да бъде приложено предложеното разпределение.");
    }
  }

  return assignments;
}

function recommendedQualificationValues(
  plan: RecommendedTournamentPlan,
) {
  const ids = poolIds(plan.poolSizes.length);

  if (plan.knockoutSize === 2) {
    return [
      `POOL_POSITION|${ids[0]}|1`,
      `POOL_POSITION|${ids[0]}|2`,
    ];
  }

  if (plan.poolSizes.length === 2 && plan.knockoutSize === 4) {
    return [
      `POOL_POSITION|${ids[0]}|1`,
      `POOL_POSITION|${ids[1]}|2`,
      `POOL_POSITION|${ids[1]}|1`,
      `POOL_POSITION|${ids[0]}|2`,
    ];
  }

  if (plan.poolSizes.length === 3 && plan.knockoutSize === 4) {
    return [
      `POOL_POSITION|${ids[0]}|1`,
      sourceValueForBestPoolPosition(2),
      `POOL_POSITION|${ids[1]}|1`,
      `POOL_POSITION|${ids[2]}|1`,
    ];
  }

  if (plan.poolSizes.length === 4 && plan.knockoutSize === 8) {
    return [
      `POOL_POSITION|${ids[0]}|1`,
      `POOL_POSITION|${ids[1]}|2`,
      `POOL_POSITION|${ids[2]}|1`,
      `POOL_POSITION|${ids[3]}|2`,
      `POOL_POSITION|${ids[1]}|1`,
      `POOL_POSITION|${ids[0]}|2`,
      `POOL_POSITION|${ids[3]}|1`,
      `POOL_POSITION|${ids[2]}|2`,
    ];
  }

  return [];
}

function sortTeamsForSeeding(
  teams: Team[],
  mode: PoolSeedingMode,
) {
  const items = [...teams];

  if (mode === "RANDOM") {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [
        items[randomIndex],
        items[index],
      ];
    }

    return items;
  }

  if (mode === "ALPHABETICAL") {
    return items.sort((first, second) =>
      first.name.localeCompare(second.name, "bg"),
    );
  }

  return items.sort((first, second) => {
    const firstSeed = first.seed ?? Number.MAX_SAFE_INTEGER;
    const secondSeed = second.seed ?? Number.MAX_SAFE_INTEGER;

    return (
      firstSeed - secondSeed ||
      first.name.localeCompare(second.name, "bg")
    );
  });
}

function distributeTeams(
  teams: Team[],
  count: number,
  mode: PoolSeedingMode,
) {
  const ids = poolIds(count);
  const orderedTeams = sortTeamsForSeeding(teams, mode);
  const assignments: Record<string, string> = {};

  orderedTeams.forEach((team, index) => {
    if (mode === "SNAKE" && count > 1) {
      const cycleLength = count * 2;
      const cyclePosition = index % cycleLength;
      const targetIndex =
        cyclePosition < count
          ? cyclePosition
          : cycleLength - cyclePosition - 1;

      assignments[team.id] = ids[targetIndex];
      return;
    }

    assignments[team.id] = ids[index % count];
  });

  return assignments;
}

function encodeSource(source: QualificationSource) {
  if (source.type === "TEAM") {
    return `TEAM|${source.teamId}`;
  }

  if (source.type === "BEST_POOL_POSITION") {
    return sourceValueForBestPoolPosition(source.position, source.rank);
  }

  return `POOL_POSITION|${source.poolId}|${source.position}`;
}

function parseSource(
  value: string,
  pools: TournamentPool[],
  teams: Team[],
): QualificationSource {
  const [type, firstValue, secondValue] = value.split("|");

  if (type === "TEAM") {
    const team = teams.find(
      (currentTeam) => currentTeam.id === firstValue,
    );

    if (!team) {
      throw new Error("Не е намерен ръчно избраният отбор.");
    }

    return {
      type: "TEAM",
      teamId: team.id,
      teamName: team.name,
      label: team.name,
    };
  }

  if (type === "POOL_POSITION") {
    const pool = pools.find(
      (currentPool) => currentPool.id === firstValue,
    );
    const position = Number(secondValue);

    if (!pool || !Number.isInteger(position) || position < 1) {
      throw new Error("Има невалидна позиция от група.");
    }

    return {
      type: "POOL_POSITION",
      poolId: pool.id,
      poolName: pool.name,
      position,
      label: `${position}. място от ${pool.name}`,
    };
  }

  if (type === "BEST_POOL_POSITION") {
    const position = Number(firstValue);
    const rank = Number(secondValue);

    if (
      !Number.isInteger(position) ||
      position < 1 ||
      !Number.isInteger(rank) ||
      rank < 1
    ) {
      // throw new Error("Невалиден избор за най-добър отбор между групите.");
      console.log("Невалиден избор за най-добър отбор между групите.");
    }

    return {
      type: "BEST_POOL_POSITION",
      position,
      rank,
      poolIds: pools.map((pool) => pool.id),
      label:
        position === 2 && rank === 1
          ? "Най-добър втори отбор"
          : `${rank}. най-добър отбор на ${position}. място`,
    };
  }

  throw new Error(
    "Избери откъде идва всеки участник в елиминациите.",
  );
}

function defaultQualificationValues(
  pools: TournamentPool[],
  knockoutSize: KnockoutSize,
) {
  if (knockoutSize === 0 || pools.length === 0) {
    return [];
  }

  if (pools.length === 1 && knockoutSize === 2) {
    return [
      `POOL_POSITION|${pools[0].id}|1`,
      `POOL_POSITION|${pools[0].id}|2`,
    ];
  }

  if (pools.length === 2 && knockoutSize === 4) {
    return [
      `POOL_POSITION|${pools[0].id}|1`,
      `POOL_POSITION|${pools[1].id}|2`,
      `POOL_POSITION|${pools[1].id}|1`,
      `POOL_POSITION|${pools[0].id}|2`,
    ];
  }

  if (
    pools.length === 3 &&
    knockoutSize === 4 &&
    pools.every((pool) => pool.teams.length >= 2)
  ) {
    return [
      `POOL_POSITION|${pools[0].id}|1`,
      sourceValueForBestPoolPosition(2),
      `POOL_POSITION|${pools[1].id}|1`,
      `POOL_POSITION|${pools[2].id}|1`,
    ];
  }

  if (
    pools.length === 4 &&
    knockoutSize === 8 &&
    pools.every((pool) => pool.teams.length >= 2)
  ) {
    return [
      `POOL_POSITION|${pools[0].id}|1`,
      `POOL_POSITION|${pools[1].id}|2`,
      `POOL_POSITION|${pools[2].id}|1`,
      `POOL_POSITION|${pools[3].id}|2`,
      `POOL_POSITION|${pools[1].id}|1`,
      `POOL_POSITION|${pools[0].id}|2`,
      `POOL_POSITION|${pools[3].id}|1`,
      `POOL_POSITION|${pools[2].id}|2`,
    ];
  }

  const available: string[] = [];
  let position = 1;

  while (available.length < knockoutSize) {
    let added = false;

    for (const pool of pools) {
      if (
        pool.teams.length >= position &&
        available.length < knockoutSize
      ) {
        available.push(
          `POOL_POSITION|${pool.id}|${position}`,
        );
        added = true;
      }
    }

    if (!added) {
      break;
    }

    position += 1;
  }

  if (available.length < knockoutSize) {
    return [];
  }

  const paired: string[] = [];
  let left = 0;
  let right = available.length - 1;

  while (left < right) {
    paired.push(available[left], available[right]);
    left += 1;
    right -= 1;
  }

  return paired.slice(0, knockoutSize);
}

function firstRoundLabel(size: KnockoutSize) {
  switch (size) {
    case 16:
      return "Осминафинал";
    case 8:
      return "Четвъртфинал";
    case 4:
      return "Полуфинал";
    case 2:
      return "Финал";
    default:
      return "Елиминация";
  }
}


function SectionTitle({
  icon,
  title,
  description,
  trailing,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {trailing}
    </div>
  );
}

function FormatSwitch({
  value,
  onChange,
}: {
  value: TournamentFormat;
  onChange: (format: TournamentFormat) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border bg-muted/40 p-1">
      {(
        ["ROUND_ROBIN", "GROUP_KNOCKOUT"] as const
      ).map((format) => (
        <Button
          key={format}
          type="button"
          size="sm"
          variant={value === format ? "default" : "ghost"}
          className="h-9 rounded-lg"
          onClick={() => onChange(format)}
        >
          {formatLabels[format]}
        </Button>
      ))}
    </div>
  );
}

function GroupCard({
  pool,
  pools,
  assignments,
  onAssignmentChange,
  qualificationLabels,
}: {
  pool: TournamentPool;
  pools: TournamentPool[];
  assignments: Record<string, string>;
  onAssignmentChange: (teamId: string, poolId: string) => void;
  qualificationLabels: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="font-semibold">{pool.name}</p>
          <p className="text-xs text-muted-foreground">
            {pool.teams.length} отбора
          </p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-bold">
          {pool.name.replace("Група ", "")}
        </span>
      </div>

      {qualificationLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b bg-emerald-50/60 px-4 py-2 dark:bg-emerald-950/20">
          {qualificationLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-emerald-200 bg-background px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="divide-y">
        {pool.teams.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Няма отбори
          </p>
        ) : (
          pool.teams.map((team, index) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                {team.seed ?? index + 1}
              </span>

              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {team.name}
              </p>

              <Select
                aria-label={`Група за ${team.name}`}
                value={assignments[team.id] ?? ""}
                onChange={(event) =>
                  onAssignmentChange(team.id, event.target.value)
                }
                className="h-8 w-24 text-xs"
              >
                {pools.map((targetPool) => (
                  <option
                    key={targetPool.id}
                    value={targetPool.id}
                  >
                    {targetPool.name.replace("Група ", "Гр. ")}
                  </option>
                ))}
              </Select>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QualificationMatchCard({
  matchNumber,
  roundName,
  homeValue,
  awayValue,
  options,
  onChange,
}: {
  matchNumber: number;
  roundName: string;
  homeValue: string;
  awayValue: string;
  options: QualificationOption[];
  onChange: (side: "home" | "away", value: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {roundName} {matchNumber}
      </p>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        {(
          [
            ["home", homeValue, "Домакин"],
            ["away", awayValue, "Гост"],
          ] as const
        ).map(([side, value, label], index) => (
          <div
            key={side}
            className={
              index === 0
                ? "border-b bg-muted/20 p-2"
                : "p-2"
            }
          >
            <Select
              aria-label={`${roundName} ${matchNumber} — ${label}`}
              value={value}
              onChange={(event) =>
                onChange(side, event.target.value)
              }
              className="border-0 bg-transparent shadow-none"
            >
              <option value="">Избери участник</option>
              <optgroup label="Позиция от група">
                {options
                  .filter(
                    (option) =>
                      option.group === "Позиция от група",
                  )
                  .map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Най-добър между групите">
                {options
                  .filter(
                    (option) =>
                      option.group === "Най-добър между групите",
                  )
                  .map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Конкретен отбор">
                {options
                  .filter(
                    (option) =>
                      option.group === "Конкретен отбор",
                  )
                  .map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

type QualificationOption = {
  value: string;
  label: string;
  group:
    | "Позиция от група"
    | "Най-добър между групите"
    | "Конкретен отбор";
};

function PoolSchedulePreview({
  pools,
  matches,
}: {
  pools: TournamentPool[];
  matches: Match[];
}) {
  const poolMatches = matches.filter(
    (match) => match.stage === "POOL",
  );

  if (poolMatches.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border bg-muted/10 p-4">
      <SectionTitle
        icon={<Users className="h-5 w-5" />}
        title="Групова фаза"
        description="Мачовете са подредени по групи и час."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {pools.map((pool) => {
          const currentMatches = poolMatches
            .filter((match) => match.poolId === pool.id)
            .sort(
              (first, second) =>
                new Date(first.startTime ?? 0).getTime() -
                new Date(second.startTime ?? 0).getTime(),
            );

          if (currentMatches.length === 0) {
            return null;
          }

          return (
            <div
              key={pool.id}
              className="overflow-hidden rounded-xl border bg-background"
            >
              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2.5">
                <p className="font-semibold">{pool.name}</p>
                <span className="text-xs text-muted-foreground">
                  {currentMatches.length} мача
                </span>
              </div>

              <div className="divide-y">
                {currentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="grid gap-2 px-3 py-3 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                  >
                    <div className="text-xs text-muted-foreground">
                      <p>{formatDate(match.startTime)}</p>
                      <p className="mt-0.5">{match.field ?? "—"}</p>
                    </div>

                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium">
                        {match.homeTeamName}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {match.awayTeamName}
                      </p>
                    </div>

                    <div className="flex overflow-hidden rounded-lg border text-sm font-bold tabular-nums">
                      <span className="flex h-8 w-8 items-center justify-center border-r bg-muted/30">
                        {match.homeScore ?? 0}
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center bg-muted/30">
                        {match.awayScore ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoundRobinPreview({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  if (matches.length === 0) {
    return null;
  }

  const standings = calculateRoundRobinStandings({
    teams,
    matches,
  });
  const rounds = Array.from(
    new Set(matches.map((match) => match.roundLabel ?? "Програма")),
  );

  return (
    <section className="rounded-2xl border bg-muted/10 p-4">
      <SectionTitle
        icon={<CalendarDays className="h-5 w-5" />}
        title="Програма и класиране"
        description="Всички мачове и текущото класиране във формат всеки срещу всеки."
      />

      <div className="mt-4 rounded-xl border bg-background p-4">
        <p className="mb-3 text-sm font-semibold">Класиране</p>
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_60px_60px_60px_60px] bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>#</span>
            <span>Отбор</span>
            <span>М</span>
            <span>П</span>
            <span>Р</span>
            <span>Т</span>
          </div>
          {standings.standings.map((standing) => (
            <div
              key={standing.teamId}
              className="grid grid-cols-[40px_minmax(0,1fr)_60px_60px_60px_60px] items-center border-t px-3 py-2 text-sm"
            >
              <span className="font-semibold">{standing.position}</span>
              <span className="truncate">{standing.teamName}</span>
              <span>{standing.played}</span>
              <span>{standing.wins}</span>
              <span>{standing.draws}</span>
              <span>{standing.points}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rounds.map((round) => (
          <div
            key={round}
            className="overflow-hidden rounded-xl border bg-background"
          >
            <div className="border-b bg-muted/40 px-3 py-2.5 font-semibold">
              {round}
            </div>

            <div className="divide-y">
              {matches
                .filter(
                  (match) =>
                    (match.roundLabel ?? "Програма") === round,
                )
                .map((match) => (
                  <div key={match.id} className="px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(match.startTime)}</span>
                      <span>{match.field ?? "—"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {match.homeTeamName}
                      </span>
                      <span className="font-bold tabular-nums">
                        {match.homeScore ?? 0}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="min-w-0 truncate">
                        {match.awayTeamName}
                      </span>
                      <span className="font-bold tabular-nums text-foreground">
                        {match.awayScore ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SchedulePanel() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] =
    useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loading, setLoading] = useState(false);

  const [generationFormat, setGenerationFormat] =
    useState<TournamentFormat>("GROUP_KNOCKOUT");
  const [poolCount, setPoolCount] = useState(1);
  const [seedingMode, setSeedingMode] =
    useState<PoolSeedingMode>("SNAKE");
  const [assignments, setAssignments] = useState<
    Record<string, string>
  >({});
  const [knockoutSize, setKnockoutSize] =
    useState<KnockoutSize>(4);
  const [includeThirdPlaceMatch, setIncludeThirdPlaceMatch] =
    useState(true);
  const [qualificationValues, setQualificationValues] = useState<
    string[]
  >([]);

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) =>
          tournament.id === selectedTournamentId,
      ),
    [selectedTournamentId, tournaments],
  );


  const recommendedPlan = useMemo(
    () => recommendedTournamentPlan(teams.length),
    [teams.length],
  );

  const pools = useMemo<TournamentPool[]>(
    () =>
      poolIds(poolCount).map((id, index) => ({
        id,
        name: poolName(index),
        order: index,
        teams: teams.filter(
          (team) => assignments[team.id] === id,
        ),
      })),
    [assignments, poolCount, teams],
  );

  const qualificationOptions = useMemo<QualificationOption[]>(() => {
    const poolOptions: QualificationOption[] = pools.flatMap((pool) =>
      Array.from(
        { length: pool.teams.length },
        (_, index) => ({
          value: `POOL_POSITION|${pool.id}|${index + 1}`,
          label: `${index + 1}. място от ${pool.name}`,
          group: "Позиция от група" as const,
        }),
      ),
    );

    const crossPoolOptions: QualificationOption[] =
      pools.length >= 3 && pools.every((pool) => pool.teams.length >= 2)
        ? [
            {
              value: sourceValueForBestPoolPosition(2),
              label: "Най-добър втори отбор",
              group: "Най-добър между групите" as const,
            },
          ]
        : [];

    const teamOptions: QualificationOption[] = teams.map((team) => ({
      value: `TEAM|${team.id}`,
      label: team.name,
      group: "Конкретен отбор" as const,
    }));

    return [...poolOptions, ...crossPoolOptions, ...teamOptions];
  }, [pools, teams]);

  const qualificationLabelsByPool = useMemo(() => {
    const result = new Map<string, string[]>();

    for (const pool of pools) {
      result.set(pool.id, []);
    }

    for (const value of qualificationValues) {
      const [type, firstValue, secondValue] = value.split("|");

      if (type === "POOL_POSITION") {
        const labels = result.get(firstValue) ?? [];
        const position = Number(secondValue);
        const label = `${position}. място продължава`;

        if (!labels.includes(label)) {
          labels.push(label);
        }

        result.set(firstValue, labels);
      }

      if (type === "BEST_POOL_POSITION" && Number(firstValue) === 2) {
        for (const pool of pools) {
          const labels = result.get(pool.id) ?? [];
          const label = "2-рият участва за най-добър втори";

          if (!labels.includes(label)) {
            labels.push(label);
          }

          result.set(pool.id, labels);
        }
      }
    }

    return result;
  }, [pools, qualificationValues]);

  const availablePoolCounts = useMemo(() => {
    if (teams.length < 2) {
      return [1];
    }

    const minimum = 1;
    const maximum = Math.min(
      8,
      Math.max(1, Math.floor(teams.length / 2)),
    );

    return Array.from(
      { length: maximum - minimum + 1 },
      (_, index) => minimum + index,
    );
  }, [teams.length]);

  const configurationWarnings = useMemo(() => {
    const warnings: string[] = [];
    const sizes = pools.map((pool) => pool.teams.length);

    if (sizes.some((size) => size > 5)) {
      warnings.push("Група не може да съдържа повече от 5 отбора.");
    }

    if (sizes.some((size) => size < 2)) {
      warnings.push("Всяка група трябва да съдържа поне 2 отбора.");
    }

    if (
      teams.length >= 6 &&
      sizes.some((size) => size < 3)
    ) {
      warnings.push(
        "При този брой отбори е възможно разпределение без група под 3 отбора.",
      );
    }

    if (
      sizes.length > 1 &&
      Math.max(...sizes) - Math.min(...sizes) > 1
    ) {
      warnings.push("Групите не са максимално балансирани.");
    }

    return warnings;
  }, [pools, teams.length]);


  async function loadTournaments() {
    setLoadingLists(true);
    setMessage("");

    try {
      const items = await getTournaments();
      setTournaments(items);

      setSelectedTournamentId((currentId) => {
        const stillExists = items.some(
          (tournament) => tournament.id === currentId,
        );

        return stillExists
          ? currentId
          : items[0]?.id ?? "";
      });
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на турнири.",
      );
    } finally {
      setLoadingLists(false);
    }
  }

  function restoreConfiguration(
    tournament: Tournament | undefined,
    loadedTeams: Team[],
  ) {
    const savedFormat = tournament?.competitionFormat;

    if (!savedFormat || savedFormat.pools.length === 0) {
      const nextMode: PoolSeedingMode = "SNAKE";
      const plan = recommendedTournamentPlan(loadedTeams.length);

      setGenerationFormat(
        tournament?.format === "ROUND_ROBIN"
          ? "ROUND_ROBIN"
          : "GROUP_KNOCKOUT",
      );
      setSeedingMode(nextMode);

      if (plan) {
        setPoolCount(plan.poolSizes.length);
        setAssignments(
          distributeTeamsByPoolSizes(
            loadedTeams,
            plan.poolSizes,
            nextMode,
          ),
        );
        setKnockoutSize(plan.knockoutSize);
        setIncludeThirdPlaceMatch(plan.includeThirdPlaceMatch);
        setQualificationValues(
          recommendedQualificationValues(plan),
        );
      } else {
        const nextCount = Math.min(
          8,
          Math.max(2, tournament?.poolCount ?? 2),
        );
        setPoolCount(nextCount);
        setAssignments(
          distributeTeams(loadedTeams, nextCount, nextMode),
        );
        setKnockoutSize(
          loadedTeams.length >= 8
            ? 8
            : loadedTeams.length >= 4
              ? 4
              : loadedTeams.length >= 2
                ? 2
                : 0,
        );
        setIncludeThirdPlaceMatch(true);
        setQualificationValues([]);
      }

      return;
    }

    const normalizedCount = Math.min(
      8,
      Math.max(1, savedFormat.pools.length),
    );
    const oldToNewPoolId = new Map<string, string>();
    const restoredAssignments: Record<string, string> = {};

    [...savedFormat.pools]
      .sort((first, second) => first.order - second.order)
      .forEach((pool, index) => {
        const nextPoolId = poolId(index);
        oldToNewPoolId.set(pool.id, nextPoolId);

        pool.teams.forEach((team) => {
          if (
            loadedTeams.some(
              (loadedTeam) => loadedTeam.id === team.id,
            )
          ) {
            restoredAssignments[team.id] = nextPoolId;
          }
        });
      });

    const fallbackAssignments = distributeTeams(
      loadedTeams.filter(
        (team) => !restoredAssignments[team.id],
      ),
      normalizedCount,
      savedFormat.seedingMode ?? "SNAKE",
    );

    setGenerationFormat("GROUP_KNOCKOUT");
    setPoolCount(normalizedCount);
    setSeedingMode(savedFormat.seedingMode ?? "SNAKE");
    setAssignments({
      ...fallbackAssignments,
      ...restoredAssignments,
    });
    setKnockoutSize(savedFormat.knockoutSize);
    setIncludeThirdPlaceMatch(
      savedFormat.includeThirdPlaceMatch ?? true,
    );
    setQualificationValues(
      [...savedFormat.qualificationSlots]
        .sort((first, second) => first.slot - second.slot)
        .map((slot) => {
          if (slot.source.type === "POOL_POSITION") {
            const normalizedPoolId =
              oldToNewPoolId.get(slot.source.poolId) ??
              slot.source.poolId;

            return `POOL_POSITION|${normalizedPoolId}|${slot.source.position}`;
          }

          return encodeSource(slot.source);
        }),
    );
  }

  async function loadTournamentData(tournamentId: string, categoryId = selectedCategoryId) {
    if (!tournamentId) {
      setTeams([]);
      setMatches([]);
      setAssignments({});
      return;
    }

    setLoadingLists(true);
    setMessage("");

    try {
      const [loadedTeams, loadedMatches, loadedCategories] = await Promise.all([
        getTeams(tournamentId, categoryId || undefined),
        getMatches(tournamentId),
        getCategories(tournamentId),
      ]);
      setCategories(loadedCategories);
      if (!categoryId && loadedCategories[0]) setSelectedCategoryId(loadedCategories[0].id);

      const sortedTeams = [...loadedTeams].sort(
        (first, second) =>
          first.name.localeCompare(second.name, "bg"),
      );

      setTeams(sortedTeams);
      setMatches(categoryId ? loadedMatches.filter((match) => match.categoryId === categoryId) : loadedMatches);
      restoreConfiguration(
        tournaments.find(
          (tournament) => tournament.id === tournamentId,
        ),
        sortedTeams,
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на програмата.",
      );
    } finally {
      setLoadingLists(false);
    }
  }

  useEffect(() => {
    void loadTournaments();
  }, []);

  useEffect(() => {
    void loadTournamentData(selectedTournamentId);
    // Avoid reloading while the user edits the current setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]);

  useEffect(() => {
    if (selectedTournamentId && selectedCategoryId) void loadTournamentData(selectedTournamentId, selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  useEffect(() => {
    if (knockoutSize === 0) {
      if (qualificationValues.length !== 0) {
        setQualificationValues([]);
      }
      return;
    }

    const validValues = new Set(
      qualificationOptions.map((option) => option.value),
    );
    const defaults = defaultQualificationValues(
      pools,
      knockoutSize,
    );

    const nextValues = Array.from(
      { length: knockoutSize },
      (_, index) => {
        const currentValue = qualificationValues[index];

        return validValues.has(currentValue)
          ? currentValue
          : defaults[index] ?? "";
      },
    );

    const changed =
      nextValues.length !== qualificationValues.length ||
      nextValues.some(
        (value, index) =>
          value !== qualificationValues[index],
      );

    if (changed) {
      setQualificationValues(nextValues);
    }
  }, [
    knockoutSize,
    pools,
    qualificationOptions,
    qualificationValues,
  ]);


  function applyRecommendedPlan() {
    if (!recommendedPlan) {
      return;
    }

    setPoolCount(recommendedPlan.poolSizes.length);
    setAssignments(
      distributeTeamsByPoolSizes(
        teams,
        recommendedPlan.poolSizes,
        seedingMode,
      ),
    );
    setKnockoutSize(recommendedPlan.knockoutSize);
    setIncludeThirdPlaceMatch(
      recommendedPlan.includeThirdPlaceMatch,
    );
    setQualificationValues(
      recommendedQualificationValues(recommendedPlan),
    );
    setMessage("Приложено е препоръчаното разпределение.");
  }

  function changePoolCount(nextCount: number) {
    const normalizedCount = Math.min(
      8,
      Math.max(1, nextCount),
    );

    setPoolCount(normalizedCount);
    setAssignments(
      distributeTeams(teams, normalizedCount, seedingMode),
    );
  }

  function autoDistribute() {
    setAssignments(
      distributeTeams(teams, poolCount, seedingMode),
    );
  }

  function estimatedKnockoutStart(
    startTime: string,
    matchDuration: number,
    breakDuration: number,
    fieldCount: number,
  ) {
    const totalMatches = pools.reduce(
      (sum, pool) =>
        sum +
        (pool.teams.length * (pool.teams.length - 1)) / 2,
      0,
    );
    const slotCount = Math.max(
      1,
      Math.ceil(totalMatches / fieldCount),
    );

    return addMinutes(
      startTime,
      slotCount * (matchDuration + breakDuration),
    );
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTournamentId) {
      setMessage("Първо избери турнир.");
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const freshTeams = await getTeams(selectedTournamentId, selectedCategoryId || undefined);

      if (freshTeams.length < 2) {
        throw new Error(
          "Добави поне два отбора, преди да генерираш програма.",
        );
      }

      const startTime = String(
        formData.get("startTime") ||
          selectedTournament?.startDate ||
          "",
      );
      const matchDuration = Number(
        formData.get("matchDuration") ||
          selectedTournament?.matchDuration ||
          10,
      );
      const breakDuration = Number(
        formData.get("breakDuration") ??
          selectedTournament?.breakDuration ??
          5,
      );
      const fieldCount = Number(
        formData.get("fieldCount") ||
          selectedTournament?.fieldCount ||
          1,
      );

      if (generationFormat === "ROUND_ROBIN") {
        const generated = generateRoundRobinSchedule({
          tournamentId: selectedTournamentId,
          teams: freshTeams,
          startTime,
          matchDuration,
          breakDuration,
          fieldCount,
          sport: selectedTournament?.sport,
        });

        const categoryMatches = generated.map((item) => ({ ...item, categoryId: selectedCategoryId || undefined }));
        await replaceTournamentSchedule(
          selectedTournamentId,
          categoryMatches,
          selectedCategoryId || undefined,
        );
        await saveTournamentFormat(
          selectedTournamentId,
          "ROUND_ROBIN",
        );

        setMatches(categoryMatches);
        setMessage(
          `Генерирани са ${generated.length} мача.`,
        );
        return;
      }

      const freshTeamMap = new Map(
        freshTeams.map((team) => [team.id, team]),
      );
      const unassignedTeams = freshTeams.filter(
        (team) => !assignments[team.id],
      );

      if (unassignedTeams.length > 0) {
        throw new Error(
          `Няма избрана група за: ${unassignedTeams
            .map((team) => team.name)
            .join(", ")}.`,
        );
      }

      const freshPools = pools.map((pool) => ({
        ...pool,
        teams: pool.teams
          .map((team) => freshTeamMap.get(team.id))
          .filter((team): team is Team => Boolean(team)),
      }));

      const oversizedPool = freshPools.find(
        (pool) => pool.teams.length > 5,
      );

      if (oversizedPool) {
        throw new Error(
          `${oversizedPool.name} има повече от 5 отбора. Разпредели отборите отново.`,
        );
      }

      const invalidPool = freshPools.find(
        (pool) => pool.teams.length < 2,
      );

      if (invalidPool) {
        throw new Error(
          `${invalidPool.name} трябва да има поне два отбора.`,
        );
      }

      const poolMatches = generatePoolSchedule({
        tournamentId: selectedTournamentId,
        pools: freshPools,
        startTime,
        matchDuration,
        breakDuration,
        fieldCount,
        sport: selectedTournament?.sport,
      });

      let qualificationSlots: QualificationSlot[] = [];
      let knockoutMatches: Match[] = [];

      if (knockoutSize > 0) {
        if (knockoutSize > freshTeams.length) {
          throw new Error(
            "Броят участници в елиминациите е по-голям от броя отбори.",
          );
        }

        if (
          qualificationValues.length !== knockoutSize ||
          qualificationValues.some((value) => !value)
        ) {
          throw new Error(
            "Избери всички участници в елиминационната схема.",
          );
        }

        const duplicateSources = new Set(qualificationValues);

        if (
          duplicateSources.size !== qualificationValues.length
        ) {
          throw new Error(
            "Една и съща позиция или отбор е избрана повече от веднъж.",
          );
        }

        qualificationSlots = qualificationValues.map(
          (value, index) => ({
            slot: index,
            source: parseSource(
              value,
              freshPools,
              freshTeams,
            ),
          }),
        );

        const requestedKnockoutStartTime = String(
          formData.get("knockoutStartTime") || "",
        );
        const knockoutStartTime =
          requestedKnockoutStartTime ||
          estimatedKnockoutStart(
            startTime,
            matchDuration,
            breakDuration,
            fieldCount,
          );

        knockoutMatches = generateKnockoutSchedule({
          tournamentId: selectedTournamentId,
          knockoutSize:
            knockoutSize as ActiveKnockoutSize,
          qualificationSlots,
          startTime: knockoutStartTime,
          matchDuration,
          breakDuration,
          fieldCount,
          includeThirdPlaceMatch,
          sport: selectedTournament?.sport,
          categoryId: selectedCategoryId || undefined,
        });
      }

      const competitionFormat: CompetitionFormat = {
        type: "GROUP_KNOCKOUT",
        seedingMode,
        pools: freshPools,
        knockoutSize,
        qualificationSlots,
        rankingRules: [
          "POINTS",
          "SCORE_DIFFERENCE",
          "SCORED",
          "WINS",
          "HEAD_TO_HEAD",
          "ALPHABETICAL",
        ],
        includeThirdPlaceMatch,
      };

      const generated = [
        ...poolMatches,
        ...knockoutMatches,
      ].sort((first, second) => {
        const stageOrder = {
          POOL: 0,
          ROUND_OF_16: 1,
          QUARTER_FINAL: 2,
          SEMI_FINAL: 3,
          THIRD_PLACE: 4,
          FINAL: 5,
        } as const;

        const firstStageOrder = stageOrder[first.stage ?? "POOL"] ?? 0;
        const secondStageOrder = stageOrder[second.stage ?? "POOL"] ?? 0;

        if (firstStageOrder !== secondStageOrder) {
          return firstStageOrder - secondStageOrder;
        }

        return new Date(first.startTime ?? 0).getTime() - new Date(second.startTime ?? 0).getTime();
      });

      const categoryMatches = generated.map((item) => ({ ...item, categoryId: selectedCategoryId || undefined }));
      await replaceTournamentSchedule(
        selectedTournamentId,
        categoryMatches,
        selectedCategoryId || undefined,
      );
      await saveCompetitionFormat(
        selectedTournamentId,
        competitionFormat,
      );

      setTournaments((current) =>
        current.map((tournament) =>
          tournament.id === selectedTournamentId
            ? {
                ...tournament,
                format: "GROUP_KNOCKOUT",
                competitionFormat,
              }
            : tournament,
        ),
      );

      await resolveTournamentProgression(
        selectedTournamentId,
      );

      const savedMatches = await getMatches(
        selectedTournamentId,
      );
      setMatches(selectedCategoryId ? savedMatches.filter((item) => item.categoryId === selectedCategoryId) : savedMatches);
      setMessage(
        `Готово: ${poolMatches.length} групови и ${knockoutMatches.length} елиминационни мача.`,
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно генериране на програмата.",
      );
    } finally {
      setLoading(false);
    }
  }

  const defaultStartTime =
    toDateTimeLocal(selectedTournament?.startDate) ||
    toDateTimeLocal(new Date().toISOString());
  const defaultMatchDuration =
    selectedTournament?.matchDuration ?? 10;
  const defaultBreakDuration =
    selectedTournament?.breakDuration ?? 5;
  const defaultFieldCount = selectedTournament?.fieldCount ?? 1;
  const defaultKnockoutStart = estimatedKnockoutStart(
    defaultStartTime,
    defaultMatchDuration,
    defaultBreakDuration,
    defaultFieldCount,
  );

  const poolMatches = matches.filter(
    (match) => match.stage === "POOL",
  );
  return (
    <Card id="schedule" className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Турнирна програма</CardTitle>
            <CardDescription className="mt-1">
              Настрой групите и виж елиминациите като ясна схема.
            </CardDescription>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{teams.length}</span>
            <span className="text-muted-foreground">отбора</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <form
          key={selectedTournamentId}
          onSubmit={generate}
          className="space-y-6"
        >
          <section className="rounded-2xl border bg-muted/10 p-4">
            <SectionTitle
              icon={<CalendarDays className="h-5 w-5" />}
              title="Основни настройки"
              trailing={
                <FormatSwitch
                  value={generationFormat}
                  onChange={setGenerationFormat}
                />
              }
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scheduleTournament">Турнир</Label>
                <Select
                  id="scheduleTournament"
                  value={selectedTournamentId}
                  onChange={(event) =>
                    setSelectedTournamentId(event.target.value)
                  }
                  disabled={
                    loadingLists || tournaments.length === 0
                  }
                >
                  {tournaments.length === 0 && (
                    <option value="">
                      Няма създадени турнири
                    </option>
                  )}
                  {tournaments.map((tournament) => (
                    <option
                      key={tournament.id}
                      value={tournament.id}
                    >
                      {tournament.name}
                      {tournament.location
                        ? ` — ${tournament.location}`
                        : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="scheduleCategory">Категория</Label><Select id="scheduleCategory" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} disabled={!categories.length}><option value="">Всички категории</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="startTime">Начало</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  defaultValue={defaultStartTime}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fieldCount">Игрища</Label>
                <Input
                  id="fieldCount"
                  name="fieldCount"
                  type="number"
                  defaultValue={defaultFieldCount}
                  min={1}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matchDuration">Мач, мин.</Label>
                <Input
                  id="matchDuration"
                  name="matchDuration"
                  type="number"
                  defaultValue={defaultMatchDuration}
                  min={1}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="breakDuration">
                  Пауза, мин.
                </Label>
                <Input
                  id="breakDuration"
                  name="breakDuration"
                  type="number"
                  defaultValue={defaultBreakDuration}
                  min={0}
                  required
                />
              </div>
            </div>
          </section>

          {generationFormat === "GROUP_KNOCKOUT" && (
            <>
              <section className="rounded-2xl border bg-muted/10 p-4">
                <SectionTitle
                  icon={<Users className="h-5 w-5" />}
                  title="Групи"
                  description="Премествай отборите директно между групите. Една група също е валидна, ако искаш едно общо класиране."
                  trailing={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoDistribute}
                      disabled={teams.length === 0}
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      Разпредели
                    </Button>
                  }
                />

                {recommendedPlan ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/20 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
                      <div>
                        <p className="font-semibold">Препоръчано разпределение</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {recommendedPlan.poolSizes
                            .map(
                              (size, index) =>
                                `${poolName(index)}: ${size}`,
                            )
                            .join(" • ")}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {recommendedPlan.explanation}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={applyRecommendedPlan}
                      className="shrink-0"
                    >
                      Приложи предложението
                    </Button>
                  </div>
                ) : teams.length > 15 ? (
                  <div className="mt-4 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Автоматичното предложение засега е налично за до 15 отбора. Можеш да настроиш групите ръчно.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="poolCount">Брой групи</Label>
                    <Select
                      id="poolCount"
                      value={String(poolCount)}
                      onChange={(event) =>
                        changePoolCount(
                          Number(event.target.value),
                        )
                      }
                    >
                      {availablePoolCounts.map((count) => (
                        <option key={count} value={count}>
                          {count} {count === 1 ? "група" : "групи"}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seedingMode">
                      Разпределяне
                    </Label>
                    <Select
                      id="seedingMode"
                      value={seedingMode}
                      onChange={(event) =>
                        setSeedingMode(
                          event.target.value as PoolSeedingMode,
                        )
                      }
                    >
                      <option value="SNAKE">По поставяне</option>
                      <option value="RANDOM">Случайно</option>
                      <option value="ALPHABETICAL">
                        По азбучен ред
                      </option>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {pools.map((pool) => (
                    <GroupCard
                      key={pool.id}
                      pool={pool}
                      pools={pools}
                      assignments={assignments}
                      onAssignmentChange={(teamId, nextPoolId) =>
                        setAssignments((current) => ({
                          ...current,
                          [teamId]: nextPoolId,
                        }))
                      }
                      qualificationLabels={
                        qualificationLabelsByPool.get(pool.id) ?? []
                      }
                    />
                  ))}
                </div>

                {configurationWarnings.length > 0 && (
                  <div className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                    {configurationWarnings.map((warning) => (
                      <p key={warning}>• {warning}</p>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border bg-muted/10 p-4">
                <SectionTitle
                  icon={<GitBranch className="h-5 w-5" />}
                  title="Елиминации"
                  description="Всеки две полета образуват един мач от първия кръг."
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="knockoutSize">Схема</Label>
                    <Select
                      id="knockoutSize"
                      value={String(knockoutSize)}
                      onChange={(event) =>
                        setKnockoutSize(
                          Number(
                            event.target.value,
                          ) as KnockoutSize,
                        )
                      }
                    >
                      <option value="0">Без елиминации</option>
                      <option value="2">Финал — 2 отбора</option>
                      <option value="4">Полуфинали — 4 отбора</option>
                      <option value="8">Четвъртфинали — 8 отбора</option>
                      <option value="16">Осминафинали — 16 отбора</option>
                    </Select>
                  </div>

                  {knockoutSize > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="knockoutStartTime">
                        Начало на елиминациите
                      </Label>
                      <Input
                        id="knockoutStartTime"
                        name="knockoutStartTime"
                        type="datetime-local"
                        defaultValue={defaultKnockoutStart}
                        required
                      />
                    </div>
                  )}
                </div>

                {knockoutSize >= 4 && (
                  <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeThirdPlaceMatch}
                      onChange={(event) =>
                        setIncludeThirdPlaceMatch(
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4"
                    />
                    Мач за трето място
                  </label>
                )}

                {knockoutSize > 0 && (
                  <div className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from(
                      { length: knockoutSize / 2 },
                      (_, matchIndex) => (
                        <QualificationMatchCard
                          key={matchIndex}
                          matchNumber={matchIndex + 1}
                          roundName={firstRoundLabel(knockoutSize)}
                          homeValue={
                            qualificationValues[
                              matchIndex * 2
                            ] ?? ""
                          }
                          awayValue={
                            qualificationValues[
                              matchIndex * 2 + 1
                            ] ?? ""
                          }
                          options={qualificationOptions}
                          onChange={(side, value) => {
                            const targetIndex =
                              matchIndex * 2 +
                              (side === "away" ? 1 : 0);

                            setQualificationValues((current) =>
                              Array.from(
                                { length: knockoutSize },
                                (_, index) =>
                                  index === targetIndex
                                    ? value
                                    : current[index] ?? "",
                              ),
                            );
                          }}
                        />
                      ),
                    )}
                  </div>
                )}

                <TournamentBracketPlanPreview
                  pools={pools}
                  knockoutSize={knockoutSize}
                  qualificationValues={qualificationValues}
                  options={qualificationOptions}
                />
              </section>
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={loading || !selectedTournamentId}
              className="min-w-56"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Генериране...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Генерирай програмата
                </>
              )}
            </Button>
          </div>
        </form>

        {message && (
          <div
            role="status"
            className="rounded-xl border bg-muted/30 px-4 py-3 text-sm"
          >
            {message}
          </div>
        )}

        {matches.length > 0 && (
          <div className="space-y-5 border-t pt-6">
            <div>
              <h2 className="text-lg font-semibold">
                Преглед на програмата
              </h2>
              <p className="text-sm text-muted-foreground">
                Чиста визуализация без излишна таблица.
              </p>
            </div>

            {generationFormat === "ROUND_ROBIN" ? (
              <RoundRobinPreview matches={matches} teams={teams} />
            ) : (
              <>
                <PoolSchedulePreview
                  pools={pools}
                  matches={poolMatches}
                />
                <TournamentBracketView
                  tournament={selectedTournament}
                  matches={matches}
                  title="Групи и bracket схема"
                  description="Класирането от групите и пътят до финала са показани заедно."
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
