"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  MonitorUp,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trophy,
} from "lucide-react";
import { MatchTimerControl } from "@/components/match-timer-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  TD,
  TH,
  TBody,
  THead,
  TR,
  Table,
} from "@/components/ui/table";
import {
  getCategories,
  getMatches,
  getTournaments,
  getPlayersByTeam,
  listenToMatch,
  setMatchStatus,
  updateMatchControlStats,
  updatePlayerGoal,
} from "@/lib/firestore-service";
import type {
  Category,
  Match,
  MatchPossession,
  MatchSport,
  Tournament,
  Player,
} from "@/lib/types";

type MatchStatField =
  | "homeScore"
  | "awayScore"
  | "homeFouls"
  | "awayFouls"
  | "homeCorners"
  | "awayCorners"
  | "homeTimeouts"
  | "awayTimeouts";

function safeNumber(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatMatchDate(value?: string) {
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function matchStageLabel(match: Match) {
  if (match.roundLabel) {
    return match.roundLabel;
  }

  switch (match.stage) {
    case "POOL":
      return match.poolName ?? "Групова фаза";
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
    default:
      return "Мач";
  }
}

function matchLabel(match: Match) {
  return `${matchStageLabel(match)} — ${formatMatchDate(match.startTime)} — ${
    match.homeTeamName
  } срещу ${match.awayTeamName}`;
}

function formatBasketballPeriod(period: number) {
  if (period <= 4) {
    return `P${period}`;
  }

  return `OT${period - 4}`;
}

function getStatusDetails(status: Match["status"]) {
  switch (status) {
    case "LIVE":
      return {
        label: "На живо",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
        dotClassName: "bg-red-500 animate-pulse",
      };

    case "FINISHED":
      return {
        label: "Завършен",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName: "bg-emerald-500",
      };

    case "CANCELLED":
      return {
        label: "Отменен",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
        dotClassName: "bg-amber-500",
      };

    default:
      return {
        label: "Предстоящ",
        className:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
        dotClassName: "bg-slate-400",
      };
  }
}

function MatchStatusBadge({
  status,
}: {
  status: Match["status"];
}) {
  const details = getStatusDetails(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${details.className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${details.dotClassName}`}
      />
      {details.label}
    </span>
  );
}

function SportModeSwitch({
  value,
  disabled,
  onChange,
}: {
  value: MatchSport;
  disabled: boolean;
  onChange: (sport: MatchSport) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Избор на спорт"
      className="inline-flex rounded-xl border bg-background p-1 shadow-sm"
    >
      <Button
        type="button"
        size="sm"
        variant={value === "FOOTBALL" ? "default" : "ghost"}
        disabled={disabled}
        onClick={() => onChange("FOOTBALL")}
        className="min-w-28 rounded-lg"
      >
        Футбол
      </Button>

      <Button
        type="button"
        size="sm"
        variant={value === "BASKETBALL" ? "default" : "ghost"}
        disabled={disabled}
        onClick={() => onChange("BASKETBALL")}
        className="min-w-28 rounded-lg"
      >
        Баскетбол
      </Button>
    </div>
  );
}

function CounterControl({
  label,
  value,
  disabled,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-center text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || value <= 0}
          onClick={onMinus}
          aria-label={`Намали ${label.toLowerCase()}`}
          className="h-10 w-10 rounded-full"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <span className="min-w-16 text-center text-4xl font-black tabular-nums tracking-tight">
          {value}
        </span>

        <Button
          type="button"
          size="icon"
          disabled={disabled}
          onClick={onPlus}
          aria-label={`Увеличи ${label.toLowerCase()}`}
          className="h-10 w-10 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function BasketballScoreControl({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-center text-sm font-medium text-muted-foreground">
        Точки
      </p>

      <p className="mt-2 text-center text-5xl font-black tabular-nums tracking-tight">
        {value}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || value <= 0}
          onClick={() => onChange(-1)}
          className="font-black"
        >
          −1
        </Button>

        <Button
          type="button"
          disabled={disabled}
          onClick={() => onChange(1)}
          className="bg-red-600 font-black text-white hover:bg-red-700"
        >
          +1
        </Button>

        <Button
          type="button"
          disabled={disabled}
          onClick={() => onChange(2)}
          className="bg-red-600 font-black text-white hover:bg-red-700"
        >
          +2
        </Button>

        <Button
          type="button"
          disabled={disabled}
          onClick={() => onChange(3)}
          className="bg-red-600 font-black text-white hover:bg-red-700"
        >
          +3
        </Button>
      </div>
    </div>
  );
}

export function MatchControlPanel() {
  const [message, setMessage] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>(
    [],
  );
  const [selectedTournamentId, setSelectedTournamentId] =
    useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [liveMatch, setLiveMatch] = useState<Match | null>(
    null,
  );

  const [loadingTournaments, setLoadingTournaments] =
    useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeScorerUid, setHomeScorerUid] = useState("");
  const [awayScorerUid, setAwayScorerUid] = useState("");

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) =>
          tournament.id === selectedTournamentId,
      ),
    [tournaments, selectedTournamentId],
  );

  const selectedMatchFromList = useMemo(
    () =>
      matches.find(
        (currentMatch) =>
          currentMatch.id === selectedMatchId,
      ),
    [matches, selectedMatchId],
  );

  const match = liveMatch ?? selectedMatchFromList ?? null;
  const matchReady = Boolean(match?.homeTeamId && match?.awayTeamId);

  const sportMode: MatchSport =
    match?.sport === "BASKETBALL"
      ? "BASKETBALL"
      : "FOOTBALL";

  const homeScore = safeNumber(match?.homeScore);
  const awayScore = safeNumber(match?.awayScore);

  const homeFouls = safeNumber(match?.homeFouls);
  const awayFouls = safeNumber(match?.awayFouls);

  const homeCorners = safeNumber(match?.homeCorners);
  const awayCorners = safeNumber(match?.awayCorners);

  const homeTimeouts = safeNumber(match?.homeTimeouts);
  const awayTimeouts = safeNumber(match?.awayTimeouts);

  const period = Math.max(
    1,
    safeNumber(match?.period) || 1,
  );

  const possession: MatchPossession =
    match?.possession ?? null;

  async function loadTournaments() {
    setLoadingTournaments(true);
    setMessage("");

    try {
      const items = await getTournaments();

      setTournaments(items);

      setSelectedTournamentId((currentId) => {
        const currentTournamentExists = items.some(
          (tournament) => tournament.id === currentId,
        );

        return currentTournamentExists
          ? currentId
          : items[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Failed to load tournaments:", error);

      setTournaments([]);
      setSelectedTournamentId("");
      setMatches([]);
      setSelectedMatchId("");
      setLiveMatch(null);

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на турнири.",
      );
    } finally {
      setLoadingTournaments(false);
    }
  }

  async function loadMatches(tournamentId: string, categoryId = selectedCategoryId) {
    if (!tournamentId) {
      setMatches([]);
      setSelectedMatchId("");
      setLiveMatch(null);
      return;
    }

    setLoadingMatches(true);
    setMessage("");

    try {
      const items = await getMatches(tournamentId);
      const filteredItems = categoryId
        ? items.filter((currentMatch) => currentMatch.categoryId === categoryId)
        : items;

      setMatches(filteredItems);

      setSelectedMatchId((currentId) => {
        const currentMatchExists = filteredItems.some(
          (currentMatch) =>
            currentMatch.id === currentId,
        );

        return currentMatchExists
          ? currentId
          : filteredItems[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Failed to load matches:", error);

      setMatches([]);
      setSelectedMatchId("");
      setLiveMatch(null);

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на програмата.",
      );
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadCategories(tournamentId: string) {
    if (!tournamentId) {
      setCategories([]);
      setSelectedCategoryId("");
      return;
    }

    try {
      const items = await getCategories(tournamentId);
      setCategories(items);
      setSelectedCategoryId((currentId) => {
        if (currentId && items.some((category) => category.id === currentId)) {
          return currentId;
        }

        return "";
      });
    } catch (error) {
      console.error("Failed to load categories:", error);
      setCategories([]);
      setSelectedCategoryId("");
    }
  }

  useEffect(() => {
    void loadTournaments();
  }, []);

  useEffect(() => {
    setLiveMatch(null);
    void loadCategories(selectedTournamentId);
  }, [selectedTournamentId]);

  useEffect(() => {
    setLiveMatch(null);

    if (!selectedTournamentId) {
      setMatches([]);
      setSelectedMatchId("");
      return;
    }

    void loadMatches(selectedTournamentId, selectedCategoryId);
  }, [selectedTournamentId, selectedCategoryId]);

  useEffect(() => {
    setLiveMatch(null);

    if (!selectedMatchId) {
      return;
    }

    const unsubscribe = listenToMatch(
      selectedMatchId,
      (nextMatch) => {
        setLiveMatch(nextMatch);
      },
    );

    return unsubscribe;
  }, [selectedMatchId]);

  useEffect(() => {
    if (!match?.homeTeamId || !match.awayTeamId) { setHomePlayers([]); setAwayPlayers([]); return; }
    void Promise.all([getPlayersByTeam(match.homeTeamId), getPlayersByTeam(match.awayTeamId)])
      .then(([home, away]) => { setHomePlayers(home); setAwayPlayers(away); setHomeScorerUid(home[0]?.uid ?? ""); setAwayScorerUid(away[0]?.uid ?? ""); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Съставите не могат да бъдат заредени."));
  }, [match?.homeTeamId, match?.awayTeamId]);

  async function changePlayerGoal(side: "home" | "away", delta: number) {
    if (!match) return;
    const uid = side === "home" ? homeScorerUid : awayScorerUid;
    if (!uid) { setMessage("Избери реален играч, преди да промениш головете."); return; }
    setSaving(true); setMessage("");
    try { await updatePlayerGoal(match.id, side, uid, delta); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Голът не може да бъде записан."); }
    finally { setSaving(false); }
  }

  async function patchStats(
    updates: Partial<Match>,
  ): Promise<boolean> {
    if (!match || saving) {
      return false;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateMatchControlStats(match.id, updates);
      return true;
    } catch (error) {
      console.error("Failed to update match stats:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно обновяване на мача.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  function increment(
    field: MatchStatField,
    delta: number,
  ) {
    if (!match || saving) {
      return;
    }

    const currentValue = safeNumber(match[field]);

    void patchStats({
      [field]: Math.max(0, currentValue + delta),
    } as Partial<Match>);
  }

  function changeSportMode(nextSport: MatchSport) {
    if (!match || saving || sportMode === nextSport) {
      return;
    }

    const updates: Partial<Match> = {
      sport: nextSport,
    };

    if (
      nextSport === "BASKETBALL" &&
      !safeNumber(match.period)
    ) {
      updates.period = 1;
    }

    void patchStats(updates);
  }

  function changePeriod(delta: number) {
    if (!match || saving) {
      return;
    }

    const nextPeriod = Math.min(
      99,
      Math.max(1, period + delta),
    );

    void patchStats({
      period: nextPeriod,
    });
  }

  function changePossession(
    side: Exclude<MatchPossession, null>,
  ) {
    if (!match || saving) {
      return;
    }

    const nextPossession =
      possession === side ? null : side;

    void patchStats({
      possession: nextPossession,
    });
  }

  async function changeStatus(status: Match["status"]) {
    if (!match || saving) {
      return;
    }

    if (status === "LIVE" && !matchReady) {
      setMessage(
        "Участниците в този елиминационен мач още не са определени.",
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await setMatchStatus(match.id, status);

      if (status === "FINISHED") {
        await loadMatches(match.tournamentId);
      }
    } catch (error) {
      console.error("Failed to update match status:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешна промяна на статуса.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDisplayWindow() {
    if (!match) {
      return;
    }

    const displayWindow = window.open(
      `/display/${match.id}`,
      "scoreboard-display",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no",
    );

    if (!displayWindow) {
      setMessage(
        "Браузърът блокира новия прозорец. Разреши изскачащите прозорци и опитай отново.",
      );
      return;
    }

    displayWindow.focus();
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <CardTitle>
                Контролен панел на мача
              </CardTitle>

              <CardDescription>
                Избери турнир и мач, за да управляваш
                резултата и статистиката в реално време.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="controlTournament">
              Турнир
            </Label>

            <Select
              id="controlTournament"
              value={selectedTournamentId}
              onChange={(event) =>
                setSelectedTournamentId(
                  event.target.value,
                )
              }
              disabled={
                loadingTournaments ||
                tournaments.length === 0
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

          <div className="space-y-2">
            <Label htmlFor="controlCategory">
              Категория
            </Label>

            <Select
              id="controlCategory"
              value={selectedCategoryId}
              onChange={(event) =>
                setSelectedCategoryId(event.target.value)
              }
              disabled={!selectedTournamentId || categories.length === 0}
            >
              <option value="">Всички категории</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="controlMatch">
              Мач от програмата
            </Label>

            <Select
              id="controlMatch"
              value={selectedMatchId}
              onChange={(event) =>
                setSelectedMatchId(event.target.value)
              }
              disabled={
                !selectedTournamentId ||
                loadingMatches ||
                matches.length === 0
              }
            >
              {matches.length === 0 && (
                <option value="">
                  Няма генерирани мачове
                </option>
              )}

              {matches.map((currentMatch) => (
                <option
                  key={currentMatch.id}
                  value={currentMatch.id}
                >
                  {matchLabel(currentMatch)}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              !selectedTournamentId || loadingMatches
            }
            onClick={() =>
              void loadMatches(selectedTournamentId, selectedCategoryId)
            }
          >
            {loadingMatches ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}

            Обнови
          </Button>
        </CardContent>
      </Card>

      {match ? (
        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">
                    {match.homeTeamName} срещу{" "}
                    {match.awayTeamName}
                  </CardTitle>

                  <MatchStatusBadge
                    status={match.status}
                  />
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <Trophy className="h-4 w-4" />
                    {matchStageLabel(match)}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    {selectedTournament?.name ??
                      "Турнир"}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {formatMatchDate(match.startTime)}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {match.field ||
                      "Без зададено игрище"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openDisplayWindow}
                >
                  <MonitorUp className="mr-2 h-4 w-4" />
                  Зрителски екран
                </Button>

                <Button
                  type="button"
                  disabled={
                    saving ||
                    !matchReady ||
                    match.status === "LIVE"
                  }
                  onClick={() =>
                    void changeStatus("LIVE")
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  Стартирай
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    saving ||
                    match.status === "FINISHED"
                  }
                  onClick={() =>
                    void changeStatus("FINISHED")
                  }
                >
                  <Square className="mr-2 h-4 w-4" />
                  Завърши
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {!matchReady && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Този мач чака резултат от група или предишен елиминационен
                мач. След приключването му отборите ще се попълнят автоматично.
              </div>
            )}

            <section className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  Режим на спортното табло
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {sportMode === "BASKETBALL"
                    ? "Управление на точки, периоди, фалове, таймаути и притежание."
                    : "Управление на голове, фалове и корнери."}
                </p>
              </div>

              <SportModeSwitch
                value={sportMode}
                disabled={saving}
                onChange={changeSportMode}
              />
            </section>

            <MatchTimerControl
              match={match}
              disabled={saving}
            />

            {sportMode === "FOOTBALL" ? (
              <section className="overflow-hidden rounded-2xl border bg-slate-950 text-white shadow-lg">
                <div className="grid items-stretch md:grid-cols-[1fr_auto_1fr]">
                  <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                      Домакин
                    </p>

                    <p className="mt-2 max-w-full truncate text-lg font-semibold text-slate-300">
                      {match.homeTeamName}
                    </p>

                    <p className="mt-3 text-7xl font-black tabular-nums tracking-tight md:text-8xl">
                      {homeScore}
                    </p>
                  </div>

                  <div className="flex items-center justify-center border-y border-slate-800 px-6 py-4 md:border-x md:border-y-0">
                    <div className="text-center">
                      <Activity className="mx-auto h-5 w-5 text-slate-400" />

                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        VS
                      </p>
                    </div>
                  </div>

                  <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                      Гост
                    </p>

                    <p className="mt-2 max-w-full truncate text-lg font-semibold text-slate-300">
                      {match.awayTeamName}
                    </p>

                    <p className="mt-3 text-7xl font-black tabular-nums tracking-tight md:text-8xl">
                      {awayScore}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl">
                <div className="border-b border-slate-800 bg-black/30 px-5 py-3 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
                    Basketball scoreboard
                  </p>
                </div>

                <div className="grid md:grid-cols-[1fr_220px_1fr]">
                  <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                      Home
                    </p>

                    <p className="mt-2 max-w-full truncate text-xl font-semibold text-slate-200">
                      {match.homeTeamName}
                    </p>

                    <p className="mt-4 font-mono text-7xl font-black tabular-nums tracking-tight text-red-500 sm:text-8xl">
                      {homeScore}
                    </p>

                    <div className="mt-4 flex gap-4 text-sm text-slate-400">
                      <span>
                        Фалове:{" "}
                        <strong className="text-white">
                          {homeFouls}
                        </strong>
                      </span>

                      <span>
                        Таймаути:{" "}
                        <strong className="text-white">
                          {homeTimeouts}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center border-y border-slate-800 bg-black/20 px-5 py-6 text-center md:border-x md:border-y-0">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500/70">
                      Период
                    </p>

                    <p className="mt-3 font-mono text-5xl font-black tabular-nums text-amber-400">
                      {formatBasketballPeriod(period)}
                    </p>

                    <div className="my-6 h-px w-full bg-slate-800" />

                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Possession
                    </p>

                    <div className="mt-4 flex w-full items-center justify-between gap-3">
                      <span
                        className={`rounded-lg border px-3 py-2 text-xs font-black ${
                          possession === "HOME"
                            ? "border-amber-400 bg-amber-400 text-black"
                            : "border-slate-700 text-slate-600"
                        }`}
                      >
                        HOME
                      </span>

                      <span className="text-xl font-black text-amber-400">
                        {possession === "HOME"
                          ? "←"
                          : possession === "AWAY"
                            ? "→"
                            : "↔"}
                      </span>

                      <span
                        className={`rounded-lg border px-3 py-2 text-xs font-black ${
                          possession === "AWAY"
                            ? "border-amber-400 bg-amber-400 text-black"
                            : "border-slate-700 text-slate-600"
                        }`}
                      >
                        GUEST
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                      Guest
                    </p>

                    <p className="mt-2 max-w-full truncate text-xl font-semibold text-slate-200">
                      {match.awayTeamName}
                    </p>

                    <p className="mt-4 font-mono text-7xl font-black tabular-nums tracking-tight text-red-500 sm:text-8xl">
                      {awayScore}
                    </p>

                    <div className="mt-4 flex gap-4 text-sm text-slate-400">
                      <span>
                        Фалове:{" "}
                        <strong className="text-white">
                          {awayFouls}
                        </strong>
                      </span>

                      <span>
                        Таймаути:{" "}
                        <strong className="text-white">
                          {awayTimeouts}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {sportMode === "BASKETBALL" && (
              <section className="rounded-2xl border bg-muted/20 p-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-semibold">
                      Период
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      След четвъртия период започват
                      продълженията.
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={saving || period <= 1}
                        onClick={() => changePeriod(-1)}
                        className="h-11 w-11 rounded-full"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <div className="text-center">
                        <p className="text-4xl font-black tabular-nums">
                          {formatBasketballPeriod(period)}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {period <= 4
                            ? `Период ${period} от 4`
                            : `Продължение ${period - 4}`}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        disabled={saving}
                        onClick={() => changePeriod(1)}
                        className="h-11 w-11 rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-semibold">
                      Притежание на топката
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Натисни повторно избрания отбор, за
                      да премахнеш притежанието.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={
                          possession === "HOME"
                            ? "default"
                            : "outline"
                        }
                        disabled={saving}
                        onClick={() =>
                          changePossession("HOME")
                        }
                        className="h-auto min-h-12 whitespace-normal"
                      >
                        ← {match.homeTeamName}
                      </Button>

                      <Button
                        type="button"
                        variant={
                          possession === "AWAY"
                            ? "default"
                            : "outline"
                        }
                        disabled={saving}
                        onClick={() =>
                          changePossession("AWAY")
                        }
                        className="h-auto min-h-12 whitespace-normal"
                      >
                        {match.awayTeamName} →
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border bg-muted/20 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Домакин
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {match.homeTeamName}
                    </h3>
                  </div>

                  <span className="rounded-full border bg-background px-3 py-1 text-sm font-semibold tabular-nums">
                    {homeScore}{" "}
                    {sportMode === "BASKETBALL"
                      ? "точки"
                      : "гола"}
                  </span>
                </div>

                {sportMode === "FOOTBALL" ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <CounterControl
                      label="Голове"
                      value={homeScore}
                      disabled={saving}
                      onMinus={() => void changePlayerGoal("home", -1)}
                      onPlus={() => void changePlayerGoal("home", 1)}
                    />

                    <CounterControl
                      label="Фалове"
                      value={homeFouls}
                      disabled={saving}
                      onMinus={() =>
                        increment("homeFouls", -1)
                      }
                      onPlus={() =>
                        increment("homeFouls", 1)
                      }
                    />

                    <CounterControl
                      label="Корнери"
                      value={homeCorners}
                      disabled={saving}
                      onMinus={() =>
                        increment("homeCorners", -1)
                      }
                      onPlus={() =>
                        increment("homeCorners", 1)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <BasketballScoreControl
                      value={homeScore}
                      disabled={saving}
                      onChange={(delta) =>
                        increment("homeScore", delta)
                      }
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <CounterControl
                        label="Отборни фалове"
                        value={homeFouls}
                        disabled={saving}
                        onMinus={() =>
                          increment("homeFouls", -1)
                        }
                        onPlus={() =>
                          increment("homeFouls", 1)
                        }
                      />

                      <CounterControl
                        label="Таймаути"
                        value={homeTimeouts}
                        disabled={saving}
                        onMinus={() =>
                          increment("homeTimeouts", -1)
                        }
                        onPlus={() =>
                          increment("homeTimeouts", 1)
                        }
                      />
                    </div>
                  </div>
                )}
                {sportMode === "FOOTBALL" && <div className="mt-4 space-y-2"><Label htmlFor="homeScorer">Голмайстор</Label><Select id="homeScorer" value={homeScorerUid} onChange={(event) => setHomeScorerUid(event.target.value)}><option value="">Избери играч</option>{homePlayers.map((player) => <option key={player.uid} value={player.uid}>{player.displayName || `${player.firstName} ${player.lastName}`}</option>)}</Select></div>}
              </section>

              <section className="rounded-2xl border bg-muted/20 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Гост
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {match.awayTeamName}
                    </h3>
                  </div>

                  <span className="rounded-full border bg-background px-3 py-1 text-sm font-semibold tabular-nums">
                    {awayScore}{" "}
                    {sportMode === "BASKETBALL"
                      ? "точки"
                      : "гола"}
                  </span>
                </div>

                {sportMode === "FOOTBALL" ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <CounterControl
                      label="Голове"
                      value={awayScore}
                      disabled={saving}
                      onMinus={() => void changePlayerGoal("away", -1)}
                      onPlus={() => void changePlayerGoal("away", 1)}
                    />

                    <CounterControl
                      label="Фалове"
                      value={awayFouls}
                      disabled={saving}
                      onMinus={() =>
                        increment("awayFouls", -1)
                      }
                      onPlus={() =>
                        increment("awayFouls", 1)
                      }
                    />

                    <CounterControl
                      label="Корнери"
                      value={awayCorners}
                      disabled={saving}
                      onMinus={() =>
                        increment("awayCorners", -1)
                      }
                      onPlus={() =>
                        increment("awayCorners", 1)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <BasketballScoreControl
                      value={awayScore}
                      disabled={saving}
                      onChange={(delta) =>
                        increment("awayScore", delta)
                      }
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <CounterControl
                        label="Отборни фалове"
                        value={awayFouls}
                        disabled={saving}
                        onMinus={() =>
                          increment("awayFouls", -1)
                        }
                        onPlus={() =>
                          increment("awayFouls", 1)
                        }
                      />

                      <CounterControl
                        label="Таймаути"
                        value={awayTimeouts}
                        disabled={saving}
                        onMinus={() =>
                          increment("awayTimeouts", -1)
                        }
                        onPlus={() =>
                          increment("awayTimeouts", 1)
                        }
                      />
                    </div>
                  </div>
                )}
                {sportMode === "FOOTBALL" && <div className="mt-4 space-y-2"><Label htmlFor="awayScorer">Голмайстор</Label><Select id="awayScorer" value={awayScorerUid} onChange={(event) => setAwayScorerUid(event.target.value)}><option value="">Избери играч</option>{awayPlayers.map((player) => <option key={player.uid} value={player.uid}>{player.displayName || `${player.firstName} ${player.lastName}`}</option>)}</Select></div>}
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <div>
                  <h3 className="font-semibold">
                    Обобщена статистика
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Данните се обновяват в реално време.
                  </p>
                </div>

                {saving && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Записване...
                  </span>
                )}
              </div>

              <Table>
                <THead>
                  <TR>
                    <TH>Отбор</TH>

                    <TH className="text-center">
                      {sportMode === "BASKETBALL"
                        ? "Точки"
                        : "Голове"}
                    </TH>

                    <TH className="text-center">
                      Фалове
                    </TH>

                    <TH className="text-center">
                      {sportMode === "BASKETBALL"
                        ? "Таймаути"
                        : "Корнери"}
                    </TH>

                    {sportMode === "BASKETBALL" && (
                      <TH className="text-center">
                        Притежание
                      </TH>
                    )}
                  </TR>
                </THead>

                <TBody>
                  <TR>
                    <TD className="font-medium">
                      {match.homeTeamName}
                    </TD>

                    <TD className="text-center font-semibold tabular-nums">
                      {homeScore}
                    </TD>

                    <TD className="text-center tabular-nums">
                      {homeFouls}
                    </TD>

                    <TD className="text-center tabular-nums">
                      {sportMode === "BASKETBALL"
                        ? homeTimeouts
                        : homeCorners}
                    </TD>

                    {sportMode === "BASKETBALL" && (
                      <TD className="text-center font-semibold">
                        {possession === "HOME"
                          ? "Да"
                          : "—"}
                      </TD>
                    )}
                  </TR>

                  <TR>
                    <TD className="font-medium">
                      {match.awayTeamName}
                    </TD>

                    <TD className="text-center font-semibold tabular-nums">
                      {awayScore}
                    </TD>

                    <TD className="text-center tabular-nums">
                      {awayFouls}
                    </TD>

                    <TD className="text-center tabular-nums">
                      {sportMode === "BASKETBALL"
                        ? awayTimeouts
                        : awayCorners}
                    </TD>

                    {sportMode === "BASKETBALL" && (
                      <TD className="text-center font-semibold">
                        {possession === "AWAY"
                          ? "Да"
                          : "—"}
                      </TD>
                    )}
                  </TR>
                </TBody>
              </Table>
            </section>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            {loadingMatches ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />

                <h3 className="mt-4 font-semibold">
                  Зареждане на мачовете
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Моля, изчакай.
                </p>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted/40">
                  <MonitorUp className="h-6 w-6 text-muted-foreground" />
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  Няма избран мач
                </h3>

                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Първо генерирай програмата в стъпка 4,
                  след което избери турнир и конкретен
                  мач.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {message && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {message}
        </div>
      )}
    </div>
  );
}
