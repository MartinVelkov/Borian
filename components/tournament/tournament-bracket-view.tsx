"use client";

import { Clock3, GitBranch, MapPin, Trophy, Users } from "lucide-react";
import { calculatePoolStandings } from "@/lib/tournament-progression";
import { stageLabel } from "@/lib/schedule-generator";
import type {
  CompetitionFormat,
  KnockoutSize,
  Match,
  MatchSource,
  MatchStage,
  PoolStanding,
  QualificationSource,
  Tournament,
  TournamentPool,
} from "@/lib/types";

const mainKnockoutStages: MatchStage[] = [
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

export type BracketQualificationOption = {
  value: string;
  label: string;
  group:
    | "Позиция от група"
    | "Най-добър между групите"
    | "Конкретен отбор";
};

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

function matchResult(match: Match) {
  const homeScore = Number(match.homeScore ?? 0);
  const awayScore = Number(match.awayScore ?? 0);

  if (match.status !== "FINISHED" || homeScore === awayScore) {
    return {
      homeWon: false,
      awayWon: false,
    };
  }

  return {
    homeWon: homeScore > awayScore,
    awayWon: awayScore > homeScore,
  };
}

function decodeSourceValue(value: string):
  | {
      type: "POOL_POSITION";
      poolId: string;
      position: number;
    }
  | {
      type: "BEST_POOL_POSITION";
      position: number;
      rank: number;
    }
  | {
      type: "TEAM";
      teamId: string;
    }
  | null {
  const [type, firstValue, secondValue] = value.split("|");

  if (type === "POOL_POSITION") {
    const position = Number(secondValue);

    if (!firstValue || !Number.isInteger(position) || position < 1) {
      return null;
    }

    return {
      type,
      poolId: firstValue,
      position,
    };
  }

  if (type === "BEST_POOL_POSITION") {
    const position = Number(firstValue);
    const rank = Number(secondValue ?? 1);

    if (
      !Number.isInteger(position) ||
      position < 1 ||
      !Number.isInteger(rank) ||
      rank < 1
    ) {
      return null;
    }

    return {
      type,
      position,
      rank,
    };
  }

  if (type === "TEAM" && firstValue) {
    return {
      type,
      teamId: firstValue,
    };
  }

  return null;
}

function sourceLabel(source?: MatchSource) {
  if (!source) {
    return "Предстои да се определи";
  }

  return source.label;
}

function qualificationBadge(params: {
  pool: TournamentPool;
  position: number;
  teamId: string;
  qualificationValues?: string[];
  format?: CompetitionFormat;
  qualifiedTeamIds?: Set<string>;
}) {
  const {
    pool,
    position,
    teamId,
    qualificationValues,
    format,
    qualifiedTeamIds,
  } = params;

  if (qualifiedTeamIds?.has(teamId)) {
    return {
      label: "Продължава",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  const decodedValues = (qualificationValues ?? [])
    .map(decodeSourceValue)
    .filter((source): source is NonNullable<ReturnType<typeof decodeSourceValue>> =>
      source !== null,
    );

  const exactPosition = format
    ? format.qualificationSlots.some(
        (slot) =>
          slot.source.type === "POOL_POSITION" &&
          slot.source.poolId === pool.id &&
          slot.source.position === position,
      )
    : decodedValues.some(
        (source) =>
          source.type === "POOL_POSITION" &&
          source.poolId === pool.id &&
          source.position === position,
      );

  if (exactPosition) {
    return {
      label: "Класира се",
      className:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
    };
  }

  const bestPositionCandidate = format
    ? format.qualificationSlots.some(
        (slot) =>
          slot.source.type === "BEST_POOL_POSITION" &&
          slot.source.position === position &&
          (!slot.source.poolIds || slot.source.poolIds.includes(pool.id)),
      )
    : decodedValues.some(
        (source) =>
          source.type === "BEST_POOL_POSITION" &&
          source.position === position,
      );

  if (bestPositionCandidate) {
    return {
      label: "Кандидат",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  const directlySelected = format
    ? format.qualificationSlots.some(
        (slot) =>
          slot.source.type === "TEAM" && slot.source.teamId === teamId,
      )
    : decodedValues.some(
        (source) => source.type === "TEAM" && source.teamId === teamId,
      );

  if (directlySelected) {
    return {
      label: "Ръчно",
      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
    };
  }

  return null;
}

function GroupStageCard({
  pool,
  standings,
  qualificationValues,
  format,
  qualifiedTeamIds,
}: {
  pool: TournamentPool;
  standings?: PoolStanding[];
  qualificationValues?: string[];
  format?: CompetitionFormat;
  qualifiedTeamIds?: Set<string>;
}) {
  const rows =
    standings && standings.length > 0
      ? standings
      : pool.teams.map((team, index) => ({
          poolId: pool.id,
          poolName: pool.name,
          position: index + 1,
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
        }));

  return (
    <div className="w-64 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2.5">
        <div>
          <p className="font-semibold">{pool.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {pool.teams.length} отбора
          </p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-bold">
          {pool.name.replace("Група ", "")}
        </span>
      </div>

      <div className="divide-y">
        {rows.map((standing) => {
          const badge = qualificationBadge({
            pool,
            position: standing.position,
            teamId: standing.teamId,
            qualificationValues,
            format,
            qualifiedTeamIds,
          });

          return (
            <div
              key={standing.teamId}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                {standing.position}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {standing.teamName}
                </p>
                {standing.played > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {standing.points} т. · {standing.difference >= 0 ? "+" : ""}
                    {standing.difference} разл.
                  </p>
                )}
              </div>

              {badge && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WildcardCard({
  labels,
}: {
  labels: string[];
}) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="w-64 rounded-xl border border-dashed bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
        Допълнително класиране
      </p>
      <div className="mt-2 space-y-1">
        {labels.map((label) => (
          <p key={label} className="text-sm font-medium">
            {label}
          </p>
        ))}
      </div>
    </div>
  );
}

function MatchTeamRow({
  name,
  score,
  winner,
  placement,
}: {
  name: string;
  score: number;
  winner: boolean;
  placement?: string;
}) {
  return (
    <div
      className={`flex min-h-9 items-stretch border-t first:border-t-0 ${
        winner ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/30"
      }`}
    >
      <div
        className={`min-w-0 flex-1 px-3 py-2 text-sm ${
          winner
            ? "font-semibold text-foreground"
            : "text-muted-foreground"
        }`}
      >
        <p className="truncate">{name || "Предстои да се определи"}</p>
      </div>

      <div
        className={`flex w-11 shrink-0 items-center justify-center text-sm font-bold tabular-nums ${
          winner
            ? "bg-emerald-500 text-white"
            : "bg-muted text-foreground"
        }`}
      >
        {score}
      </div>

      {placement && (
        <div className="ml-1 flex w-11 shrink-0 items-center justify-center rounded-r-lg bg-amber-100 px-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          {placement}
        </div>
      )}
    </div>
  );
}

function BracketMatchCard({ match }: { match: Match }) {
  const result = matchResult(match);
  const homeScore = Number(match.homeScore ?? 0);
  const awayScore = Number(match.awayScore ?? 0);
  const isFinal = match.stage === "FINAL";
  const isThirdPlace = match.stage === "THIRD_PLACE";

  return (
    <div className="relative w-56 shrink-0">
      <div className="mb-1.5 flex min-w-0 items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Clock3 className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatDate(match.startTime)}</span>
        </span>

        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{match.field ?? "—"}</span>
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <MatchTeamRow
          name={match.homeTeamName || sourceLabel(match.homeSource)}
          score={homeScore}
          winner={result.homeWon}
          placement={
            isFinal && result.homeWon
              ? "1-во"
              : isFinal && result.awayWon
                ? "2-ро"
                : isThirdPlace && result.homeWon
                  ? "3-то"
                  : isThirdPlace && result.awayWon
                    ? "4-то"
                    : undefined
          }
        />
        <MatchTeamRow
          name={match.awayTeamName || sourceLabel(match.awaySource)}
          score={awayScore}
          winner={result.awayWon}
          placement={
            isFinal && result.awayWon
              ? "1-во"
              : isFinal && result.homeWon
                ? "2-ро"
                : isThirdPlace && result.awayWon
                  ? "3-то"
                  : isThirdPlace && result.homeWon
                    ? "4-то"
                    : undefined
          }
        />
      </div>
    </div>
  );
}

function KnockoutCanvas({ matches }: { matches: Match[] }) {
  const stageColumns = mainKnockoutStages
    .map((stage) => ({
      stage,
      matches: matches
        .filter((match) => match.stage === stage)
        .sort(
          (first, second) =>
            (first.bracketOrder ?? 0) - (second.bracketOrder ?? 0),
        ),
    }))
    .filter((column) => column.matches.length > 0);

  const thirdPlaceMatch = matches.find(
    (match) => match.stage === "THIRD_PLACE",
  );

  if (stageColumns.length === 0 && !thirdPlaceMatch) {
    return (
      <div className="flex min-h-56 w-[360px] items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Елиминационните мачове още не са генерирани.
      </div>
    );
  }

  const cardWidth = 224;
  const columnGap = 96;
  const rowHeight = 144;
  const cardHeight = 104;
  const headingHeight = 42;
  const firstRoundCount = Math.max(
    1,
    stageColumns[0]?.matches.length ?? 1,
  );
  const canvasHeight = Math.max(180, firstRoundCount * rowHeight);
  const canvasWidth =
    stageColumns.length * cardWidth +
    Math.max(0, stageColumns.length - 1) * columnGap;

  function matchCenter(columnIndex: number, matchIndex: number) {
    return (
      (matchIndex * 2 ** columnIndex + 2 ** (columnIndex - 1)) *
      rowHeight
    );
  }

  return (
    <div>
      <div
        className="relative min-w-max"
        style={{
          width: canvasWidth,
          height: canvasHeight + headingHeight,
        }}
      >
        {stageColumns.map((column, columnIndex) => (
          <p
            key={column.stage}
            className="absolute top-0 text-center text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
            style={{
              left: columnIndex * (cardWidth + columnGap),
              width: cardWidth,
            }}
          >
            {stageLabel(column.stage)}
          </p>
        ))}

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-0"
          style={{
            top: headingHeight,
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          {stageColumns.slice(0, -1).flatMap((column, columnIndex) => {
            const nextColumn = stageColumns[columnIndex + 1];
            const startX =
              columnIndex * (cardWidth + columnGap) + cardWidth;
            const endX = (columnIndex + 1) * (cardWidth + columnGap);
            const middleX = startX + columnGap / 2;

            return column.matches.map((match, matchIndex) => {
              const parentIndex = Math.floor(matchIndex / 2);

              if (!nextColumn.matches[parentIndex]) {
                return null;
              }

              const childY = matchCenter(columnIndex, matchIndex);
              const parentY = matchCenter(columnIndex + 1, parentIndex);

              return (
                <path
                  key={`${match.id}-connector`}
                  d={`M ${startX} ${childY} H ${middleX} V ${parentY} H ${endX}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border"
                />
              );
            });
          })}
        </svg>

        {stageColumns.flatMap((column, columnIndex) =>
          column.matches.map((match, matchIndex) => {
            const centerY = matchCenter(columnIndex, matchIndex);

            return (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: columnIndex * (cardWidth + columnGap),
                  top: headingHeight + centerY - cardHeight / 2,
                  width: cardWidth,
                }}
              >
                <BracketMatchCard match={match} />
              </div>
            );
          }),
        )}
      </div>

      {thirdPlaceMatch && (
        <div className="mt-6 border-t pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Мач за трето място
          </p>
          <BracketMatchCard match={thirdPlaceMatch} />
        </div>
      )}
    </div>
  );
}

function PlannedKnockoutCanvas({
  knockoutSize,
  qualificationValues,
  options,
}: {
  knockoutSize: KnockoutSize;
  qualificationValues: string[];
  options: BracketQualificationOption[];
}) {
  const optionLabels = new Map(
    options.map((option) => [option.value, option.label]),
  );
  const roundCounts: number[] = [];
  let matchCount = knockoutSize / 2;

  while (matchCount >= 1) {
    roundCounts.push(matchCount);
    matchCount /= 2;
  }

  const roundNames = roundCounts.map((_, index) => {
    const participants = knockoutSize / 2 ** index;
    return firstRoundLabel(participants as KnockoutSize);
  });
  const cardWidth = 224;
  const columnGap = 96;
  const rowHeight = 126;
  const cardHeight = 78;
  const headingHeight = 38;
  const canvasHeight = Math.max(150, roundCounts[0] * rowHeight);
  const canvasWidth =
    roundCounts.length * cardWidth +
    Math.max(0, roundCounts.length - 1) * columnGap;

  function center(columnIndex: number, index: number) {
    return (
      (index * 2 ** columnIndex + 2 ** (columnIndex - 1)) *
      rowHeight
    );
  }

  function plannedRows(columnIndex: number, matchIndex: number) {
    if (columnIndex === 0) {
      const homeValue = qualificationValues[matchIndex * 2] ?? "";
      const awayValue = qualificationValues[matchIndex * 2 + 1] ?? "";

      return [
        optionLabels.get(homeValue) ?? "Избери участник",
        optionLabels.get(awayValue) ?? "Избери участник",
      ];
    }

    const previousRound = roundNames[columnIndex - 1];
    return [
      `Победител от ${previousRound} ${matchIndex * 2 + 1}`,
      `Победител от ${previousRound} ${matchIndex * 2 + 2}`,
    ];
  }

  return (
    <div
      className="relative min-w-max"
      style={{
        width: canvasWidth,
        height: canvasHeight + headingHeight,
      }}
    >
      {roundCounts.map((_, columnIndex) => (
        <p
          key={roundNames[columnIndex]}
          className="absolute top-0 text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
          style={{
            left: columnIndex * (cardWidth + columnGap),
            width: cardWidth,
          }}
        >
          {roundNames[columnIndex]}
        </p>
      ))}

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-0"
        style={{
          top: headingHeight,
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        {roundCounts.slice(0, -1).flatMap((count, columnIndex) => {
          const startX =
            columnIndex * (cardWidth + columnGap) + cardWidth;
          const endX = (columnIndex + 1) * (cardWidth + columnGap);
          const middleX = startX + columnGap / 2;

          return Array.from({ length: count }, (_, matchIndex) => {
            const childY = center(columnIndex, matchIndex);
            const parentY = center(
              columnIndex + 1,
              Math.floor(matchIndex / 2),
            );

            return (
              <path
                key={`${columnIndex}-${matchIndex}`}
                d={`M ${startX} ${childY} H ${middleX} V ${parentY} H ${endX}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-border"
              />
            );
          });
        })}
      </svg>

      {roundCounts.flatMap((count, columnIndex) =>
        Array.from({ length: count }, (_, matchIndex) => {
          const rows = plannedRows(columnIndex, matchIndex);
          const matchCenter = center(columnIndex, matchIndex);

          return (
            <div
              key={`${columnIndex}-${matchIndex}`}
              className="absolute overflow-hidden rounded-xl border bg-background shadow-sm"
              style={{
                left: columnIndex * (cardWidth + columnGap),
                top: headingHeight + matchCenter - cardHeight / 2,
                width: cardWidth,
              }}
            >
              {rows.map((label, rowIndex) => (
                <div
                  key={`${label}-${rowIndex}`}
                  className={`truncate px-3 py-2 text-sm ${
                    rowIndex === 0
                      ? "border-b font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          );
        }),
      )}
    </div>
  );
}

function bestPositionLabelsFromValues(
  qualificationValues: string[],
  options: BracketQualificationOption[],
) {
  const optionLabels = new Map(
    options.map((option) => [option.value, option.label]),
  );

  return qualificationValues
    .filter((value) => value.startsWith("BEST_POOL_POSITION|"))
    .map((value) => optionLabels.get(value) ?? "Най-добър отбор между групите")
    .filter((value, index, values) => values.indexOf(value) === index);
}

function bestPositionLabelsFromFormat(format?: CompetitionFormat) {
  if (!format) {
    return [];
  }

  return format.qualificationSlots
    .map((slot) => slot.source)
    .filter(
      (source): source is Extract<
        QualificationSource,
        { type: "BEST_POOL_POSITION" }
      > => source.type === "BEST_POOL_POSITION",
    )
    .map((source) => source.label)
    .filter((value, index, values) => values.indexOf(value) === index);
}

export function TournamentBracketPlanPreview({
  pools,
  knockoutSize,
  qualificationValues,
  options,
}: {
  pools: TournamentPool[];
  knockoutSize: KnockoutSize;
  qualificationValues: string[];
  options: BracketQualificationOption[];
}) {
  if (knockoutSize === 0) {
    return null;
  }

  const wildcardLabels = bestPositionLabelsFromValues(
    qualificationValues,
    options,
  );

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-semibold">Преглед на bracket схемата</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Групите, класиращите се позиции и елиминациите са показани в една схема.
          </p>
        </div>
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="overflow-x-auto p-5">
        <div className="flex min-w-max items-center gap-10">
          <div className="shrink-0">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Групова фаза
            </p>
            <div className="space-y-4">
              {pools.map((pool) => (
                <GroupStageCard
                  key={pool.id}
                  pool={pool}
                  qualificationValues={qualificationValues}
                />
              ))}
              <WildcardCard labels={wildcardLabels} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
            <div className="h-px w-12 bg-border" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
              →
            </span>
            <div className="h-px w-12 bg-border" />
          </div>

          <PlannedKnockoutCanvas
            knockoutSize={knockoutSize}
            qualificationValues={qualificationValues}
            options={options}
          />
        </div>
      </div>
    </div>
  );
}

export function TournamentBracketView({
  tournament,
  matches,
  title = "Турнирна схема",
  description = "Групите и елиминационната фаза се обновяват според резултатите.",
}: {
  tournament?: Tournament | null;
  matches: Match[];
  title?: string;
  description?: string;
}) {
  const format = tournament?.competitionFormat;

  if (!format || format.type !== "GROUP_KNOCKOUT") {
    return (
      <section className="rounded-2xl border border-dashed bg-muted/10 p-8 text-center">
        <GitBranch className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-semibold">Няма групова bracket схема</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Първо генерирай турнир във формат „Групи + елиминации“.
        </p>
      </section>
    );
  }

  const standings = new Map(
    format.pools.map((pool) => {
      const result = calculatePoolStandings({
        pool,
        matches,
        rankingRules: format.rankingRules,
      });

      return [pool.id, result.standings] as const;
    }),
  );

  const firstKnockoutStage = mainKnockoutStages.find((stage) =>
    matches.some((match) => match.stage === stage),
  );
  const firstRoundMatches = firstKnockoutStage
    ? matches.filter((match) => match.stage === firstKnockoutStage)
    : [];
  const qualifiedTeamIds = new Set(
    firstRoundMatches.flatMap((match) =>
      [match.homeTeamId, match.awayTeamId].filter(Boolean),
    ),
  );
  const knockoutMatches = matches.filter(
    (match) => match.stage && match.stage !== "POOL",
  );
  const wildcardLabels = bestPositionLabelsFromFormat(format);

  return (
    <section className="overflow-hidden rounded-2xl border bg-muted/10">
      <div className="flex flex-col gap-3 border-b bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          {format.pools.length} групи
          <span>·</span>
          {format.knockoutSize} отбора в елиминациите
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <div className="flex min-w-max items-center gap-10">
          <div className="shrink-0">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Групова фаза
            </p>
            <div className="space-y-4">
              {format.pools.map((pool) => (
                <GroupStageCard
                  key={pool.id}
                  pool={pool}
                  standings={standings.get(pool.id)}
                  format={format}
                  qualifiedTeamIds={qualifiedTeamIds}
                />
              ))}
              <WildcardCard labels={wildcardLabels} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
            <div className="h-px w-12 bg-border" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background">
              →
            </span>
            <div className="h-px w-12 bg-border" />
          </div>

          <KnockoutCanvas matches={knockoutMatches} />
        </div>
      </div>
    </section>
  );
}