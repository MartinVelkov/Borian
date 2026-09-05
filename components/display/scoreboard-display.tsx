"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  Clock3,
  Loader2,
  Radio,
  Shield,
} from "lucide-react";

import { listenToMatch } from "@/lib/firestore-service";
import {
  formatCountdown,
  getTimerRemainingSeconds,
} from "@/lib/match-timer";
import type { Match } from "@/lib/types";

import logo from "./logo.jpg";

type SportMode = "FOOTBALL" | "BASKETBALL";
type PossessionSide = "HOME" | "AWAY" | null;
type ScoreSide = Exclude<PossessionSide, null>;

type ScoreAnimationEvent = {
  id: number;
  side: ScoreSide;
  delta: number;
  sport: SportMode;
};

type TeamStat = {
  label: string;
  value: number;
};

type ThemeVariables = CSSProperties & {
  "--sport-accent": string;
  "--sport-accent-rgb": string;
  "--sport-secondary": string;
  "--sport-secondary-rgb": string;
  "--score-color": string;
};

const SPORT_THEME: Record<
  SportMode,
  {
    label: string;
    subtitle: string;
    accent: string;
    accentRgb: string;
    secondary: string;
    secondaryRgb: string;
    score: string;
  }
> = {
  FOOTBALL: {
    label: "3X3 FOOTBALL",
    subtitle: "LIVE MATCH",
    accent: "#63D7FF",
    accentRgb: "99, 215, 255",
    secondary: "#4169E1",
    secondaryRgb: "65, 105, 225",
    score: "#FFFFFF",
  },
  BASKETBALL: {
    label: "3X3 BASKETBALL",
    subtitle: "STREETBALL LIVE",
    accent: "#FF9A3D",
    accentRgb: "255, 154, 61",
    secondary: "#5FA8FF",
    secondaryRgb: "95, 168, 255",
    score: "#FFB15C",
  },
};

function safeNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatBasketballPeriod(period: number) {
  const safePeriod = Math.max(1, period);

  if (safePeriod <= 4) {
    return `P${safePeriod}`;
  }

  return `OT${safePeriod - 4}`;
}

function useMatchCountdown(match: Match | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!match) {
      setRemainingSeconds(0);
      return;
    }

    const currentMatch = match;

    function updateCountdown() {
      setRemainingSeconds(getTimerRemainingSeconds(currentMatch));
    }

    updateCountdown();

    if (match.timerState !== "RUNNING") {
      return;
    }

    const intervalId = window.setInterval(updateCountdown, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    match?.id,
    match?.timerState,
    match?.timerEndsAt,
    match?.timerRemainingSeconds,
    match?.halfDurationSeconds,
    match?.currentHalf,
  ]);

  return remainingSeconds;
}

function ScoreboardLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[1.15rem] border border-white/15 bg-[#171042] shadow-[0_18px_50px_rgba(0,0,0,0.42)] ${
        compact
          ? "h-16 w-16 md:h-20 md:w-20"
          : "h-[clamp(5rem,9vw,8rem)] w-[clamp(5rem,9vw,8rem)]"
      }`}
    >
      <Image
        src={logo}
        alt="Bulgarian Street Sports"
        fill
        priority
        sizes={compact ? "80px" : "128px"}
        className="object-cover"
      />
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function SportIcon({ sport }: { sport: SportMode }) {
  if (sport === "FOOTBALL") {
    return (
      <div className="relative h-9 w-9 rounded-full border-2 border-[var(--sport-accent)]/80 md:h-12 md:w-12">
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[var(--sport-accent)] md:h-4 md:w-4" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--sport-accent)]/30" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--sport-accent)]/30" />
      </div>
    );
  }

  return (
    <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-[var(--sport-accent)] bg-[rgba(var(--sport-accent-rgb),0.08)] md:h-12 md:w-12">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-[26deg] bg-[var(--sport-accent)]/80" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 -rotate-[26deg] bg-[var(--sport-accent)]/80" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--sport-accent)]/80" />
      <div className="absolute -left-[55%] top-1/2 h-[72%] w-full -translate-y-1/2 rounded-full border border-[var(--sport-accent)]/80" />
      <div className="absolute -right-[55%] top-1/2 h-[72%] w-full -translate-y-1/2 rounded-full border border-[var(--sport-accent)]/80" />
    </div>
  );
}

function ArenaBackground({ sport }: { sport: SportMode }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#050817]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(var(--sport-secondary-rgb),0.25),transparent_45%)]" />
      <div className="absolute -left-[10%] top-[-36%] h-[85%] w-[58%] rotate-[-12deg] bg-[linear-gradient(135deg,rgba(var(--sport-secondary-rgb),0.17),transparent_70%)] blur-2xl" />
      <div className="absolute -right-[12%] bottom-[-42%] h-[85%] w-[58%] rotate-[-12deg] bg-[linear-gradient(315deg,rgba(var(--sport-accent-rgb),0.13),transparent_70%)] blur-2xl" />

      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:4.5rem_4.5rem]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#050817_0%,transparent_15%,transparent_85%,#050817_100%)]" />

      {sport === "FOOTBALL" ? (
        <div className="absolute left-1/2 top-1/2 h-[78%] w-[72%] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]">
          <div className="absolute inset-0 rounded-[2rem] border-2 border-white" />
          <div className="absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 border-l-2 border-white" />
          <div className="absolute left-1/2 top-1/2 h-[35%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" />
          <div className="absolute left-0 top-1/2 h-[44%] w-[14%] -translate-y-1/2 border-y-2 border-r-2 border-white" />
          <div className="absolute right-0 top-1/2 h-[44%] w-[14%] -translate-y-1/2 border-y-2 border-l-2 border-white" />
        </div>
      ) : (
        <div className="absolute left-1/2 top-1/2 h-[78%] w-[72%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]">
          <div className="absolute inset-0 rounded-[2rem] border-2 border-white" />
          <div className="absolute left-1/2 top-0 h-full w-0 -translate-x-1/2 border-l-2 border-white" />
          <div className="absolute left-1/2 top-1/2 h-[26%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" />
          <div className="absolute left-0 top-1/2 h-[34%] w-[17%] -translate-y-1/2 border-y-2 border-r-2 border-white" />
          <div className="absolute right-0 top-1/2 h-[34%] w-[17%] -translate-y-1/2 border-y-2 border-l-2 border-white" />
          <div className="absolute -left-[12%] top-1/2 h-[68%] w-[30%] -translate-y-1/2 rounded-full border-2 border-white" />
          <div className="absolute -right-[12%] top-1/2 h-[68%] w-[30%] -translate-y-1/2 rounded-full border-2 border-white" />
        </div>
      )}

      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--sport-accent)] to-transparent opacity-80" />
      <div className="absolute inset-x-[12%] bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

function MatchTopBar({ sport }: { sport: SportMode }) {
  const theme = SPORT_THEME[sport];

  return (
    <header className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 md:h-16 md:px-8">
      <div className="flex items-center gap-3">
        <SportIcon sport={sport} />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white md:text-sm">
            {theme.label}
          </p>
          <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-white/35 md:text-[10px]">
            {theme.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 md:px-4 md:py-2">
        <Radio className="h-3.5 w-3.5 text-[var(--sport-accent)] md:h-4 md:w-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/60 md:text-xs">
          На живо
        </span>
      </div>
    </header>
  );
}

function TeamStats({ stats }: { stats: TeamStat[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 md:gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 backdrop-blur-sm md:rounded-2xl md:px-5 md:py-4"
        >
          <p className="text-[7px] font-bold uppercase tracking-[0.17em] text-white/35 md:text-xs">
            {stat.label}
          </p>
          <p className="mt-1 font-mono text-xl font-black tabular-nums text-white md:text-4xl">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PossessionPill({ side }: { side: ScoreSide }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sport-accent)]/40 bg-[rgba(var(--sport-accent-rgb),0.12)] px-3 py-1.5 shadow-[0_0_24px_rgba(var(--sport-accent-rgb),0.14)] md:px-4 md:py-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--sport-accent)]" />
      <span className="text-[8px] font-black uppercase tracking-[0.14em] text-[var(--sport-accent)] md:text-xs">
        {side === "HOME" ? "Притежание" : "Притежание"}
      </span>
    </div>
  );
}

function TeamSide({
  side,
  name,
  score,
  stats,
  sport,
  possession,
  celebrating,
}: {
  side: ScoreSide;
  name: string;
  score: number;
  stats: TeamStat[];
  sport: SportMode;
  possession: boolean;
  celebrating: boolean;
}) {
  const isHome = side === "HOME";

  return (
    <section
      className={`relative flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[1.4rem] border bg-[#0B1025]/80 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 md:rounded-[2rem] md:p-7 ${
        celebrating
          ? "scale-[1.012] border-[var(--sport-accent)]/70 shadow-[0_0_55px_rgba(var(--sport-accent-rgb),0.22)]"
          : "border-white/[0.09]"
      }`}
    >
      <div
        className={`absolute top-0 h-1.5 w-[54%] bg-gradient-to-r from-[var(--sport-secondary)] to-[var(--sport-accent)] md:h-2 ${
          isHome ? "left-0" : "right-0 rotate-180"
        }`}
      />
      <div
        className={`absolute top-0 h-full w-2/3 opacity-70 ${
          isHome
            ? "left-0 bg-[linear-gradient(105deg,rgba(var(--sport-secondary-rgb),0.16),transparent_62%)]"
            : "right-0 bg-[linear-gradient(255deg,rgba(var(--sport-secondary-rgb),0.16),transparent_62%)]"
        }`}
      />
      <div
        className={`absolute top-1/2 h-[56%] aspect-square -translate-y-1/2 rounded-full border border-white/[0.045] ${
          isHome ? "-left-[32%]" : "-right-[32%]"
        }`}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${isHome ? "" : "order-2"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] md:h-11 md:w-11 md:rounded-2xl">
            <Shield className="h-4 w-4 text-white/45 md:h-5 md:w-5" />
          </div>
          <div className={isHome ? "text-left" : "text-right"}>
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 md:text-[10px]">
              {isHome ? "Домакин" : "Гост"}
            </p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/55 md:text-xs">
              Отбор
            </p>
          </div>
        </div>

        {sport === "BASKETBALL" && possession ? (
          <PossessionPill side={side} />
        ) : (
          <div className="h-8 md:h-9" />
        )}
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center py-2 text-center md:py-4">
        <h2
          title={name}
          className="line-clamp-2 w-full break-words px-1 text-[clamp(1rem,2.6vw,2.35rem)] font-black uppercase leading-[0.98] tracking-[-0.035em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.28)] md:px-3"
        >
          {name}
        </h2>

        <div
          className={`mt-4 font-mono text-[clamp(5.6rem,16vw,13.5rem)] font-black leading-[0.68] tracking-[-0.1em] tabular-nums text-[var(--score-color)] drop-shadow-[0_10px_38px_rgba(0,0,0,0.35)] md:mt-7 ${
            celebrating ? "animate-[scorePop_900ms_cubic-bezier(.2,.8,.2,1)_both]" : ""
          }`}
        >
          {score}
        </div>
      </div>

      <div className="relative z-10">
        <TeamStats stats={stats} />
      </div>
    </section>
  );
}

function TimerStateBadge({
  timerRunning,
  timerFinished,
  timerState,
}: {
  timerRunning: boolean;
  timerFinished: boolean;
  timerState: Match["timerState"];
}) {
  const label = timerFinished
    ? "КРАЙ"
    : timerRunning
      ? "В ИГРА"
      : timerState === "PAUSED"
        ? "ПАУЗА"
        : "ГОТОВ";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 md:px-4 md:py-2 ${
        timerFinished
          ? "border-red-400/25 bg-red-500/10 text-red-300"
          : timerRunning
            ? "border-[var(--sport-accent)]/30 bg-[rgba(var(--sport-accent-rgb),0.1)] text-[var(--sport-accent)]"
            : "border-white/10 bg-white/[0.035] text-white/45"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          timerFinished
            ? "bg-red-400"
            : timerRunning
              ? "animate-pulse bg-[var(--sport-accent)]"
              : "bg-white/25"
        }`}
      />
      <span className="text-[8px] font-black uppercase tracking-[0.18em] md:text-xs">
        {label}
      </span>
    </div>
  );
}

function BasketballPossession({ possession }: { possession: PossessionSide }) {
  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2.5 md:rounded-[1.25rem] md:p-3.5">
      <p className="text-center text-[7px] font-black uppercase tracking-[0.18em] text-white/30 md:text-[10px]">
        Притежание
      </p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div
          className={`rounded-xl border px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.12em] transition-all md:px-3 md:py-3 md:text-xs ${
            possession === "HOME"
              ? "border-[var(--sport-accent)] bg-[var(--sport-accent)] text-[#120B04] shadow-[0_0_22px_rgba(var(--sport-accent-rgb),0.28)]"
              : "border-white/[0.07] bg-black/15 text-white/22"
          }`}
        >
          Home
        </div>
        <span className="font-mono text-lg font-black text-[var(--sport-accent)] md:text-2xl">
          {possession === "HOME" ? "←" : possession === "AWAY" ? "→" : "•"}
        </span>
        <div
          className={`rounded-xl border px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.12em] transition-all md:px-3 md:py-3 md:text-xs ${
            possession === "AWAY"
              ? "border-[var(--sport-accent)] bg-[var(--sport-accent)] text-[#120B04] shadow-[0_0_22px_rgba(var(--sport-accent-rgb),0.28)]"
              : "border-white/[0.07] bg-black/15 text-white/22"
          }`}
        >
          Guest
        </div>
      </div>
    </div>
  );
}

function CenterControl({
  sport,
  currentHalf,
  period,
  possession,
  remainingSeconds,
  timerRunning,
  timerFinished,
  timerState,
}: {
  sport: SportMode;
  currentHalf: number;
  period: number;
  possession: PossessionSide;
  remainingSeconds: number;
  timerRunning: boolean;
  timerFinished: boolean;
  timerState: Match["timerState"];
}) {
  const isCritical = remainingSeconds > 0 && remainingSeconds <= 30;
  const segmentLabel = sport === "FOOTBALL" ? "Част" : "Период";
  const segmentValue =
    sport === "FOOTBALL" ? String(currentHalf) : formatBasketballPeriod(period);

  return (
    <section className="relative flex min-h-0 min-w-0 flex-col items-center overflow-hidden rounded-[1.4rem] border border-white/[0.1] bg-[#080D20]/92 px-2.5 py-3 shadow-[0_28px_90px_rgba(0,0,0,0.44)] backdrop-blur-xl md:rounded-[2rem] md:px-5 md:py-5">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-[var(--sport-accent)] to-transparent md:h-2" />
      <div className="absolute left-1/2 top-[18%] h-[28%] aspect-square -translate-x-1/2 rounded-full bg-[rgba(var(--sport-accent-rgb),0.1)] blur-3xl" />

      <div className="relative z-10 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 md:rounded-2xl md:px-4 md:py-3">
        <span className="text-[7px] font-black uppercase tracking-[0.17em] text-white/35 md:text-[10px]">
          {segmentLabel}
        </span>
        <span className="rounded-lg bg-white/[0.07] px-2.5 py-1 font-mono text-sm font-black text-white md:rounded-xl md:px-3.5 md:py-1.5 md:text-xl">
          {segmentValue}
        </span>
      </div>

      <div className="relative z-10 mt-3 md:mt-5">
        <ScoreboardLogo />
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-2 md:mt-5">
        <Clock3 className="h-3.5 w-3.5 text-white/35 md:h-4 md:w-4" />
        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 md:text-[11px]">
          Оставащо време
        </p>
      </div>

      <div
        className={`relative z-10 mt-1 whitespace-nowrap font-mono text-[clamp(2.4rem,6.3vw,5.4rem)] font-black leading-none tracking-[-0.08em] tabular-nums md:mt-2 ${
          timerFinished
            ? "text-red-300"
            : isCritical
              ? "animate-[criticalTimer_1s_ease-in-out_infinite] text-red-300"
              : timerRunning
                ? "text-[var(--sport-accent)]"
                : "text-white"
        }`}
      >
        {formatCountdown(remainingSeconds)}
      </div>

      <div className="relative z-10 mt-3 md:mt-4">
        <TimerStateBadge
          timerRunning={timerRunning}
          timerFinished={timerFinished}
          timerState={timerState}
        />
      </div>

      <div className="relative z-10 my-3 h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent md:my-5" />

      <div className="relative z-10 mt-auto w-full">
        {sport === "BASKETBALL" ? (
          <BasketballPossession possession={possession} />
        ) : (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 md:rounded-[1.25rem] md:py-4">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/30 md:text-sm">
              VS
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
          </div>
        )}
      </div>
    </section>
  );
}

function CelebrationParticles({ sport }: { sport: SportMode }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }).map((_, index) => (
        <span
          key={index}
          className={`absolute left-1/2 top-1/2 h-1.5 w-10 origin-left rounded-full animate-[particleBurst_1450ms_cubic-bezier(.15,.8,.2,1)_both] md:h-2 md:w-16 ${
            sport === "BASKETBALL"
              ? "bg-[var(--sport-accent)]"
              : "bg-gradient-to-r from-[var(--sport-accent)] to-white"
          }`}
          style={
            {
              "--rotation": `${index * (360 / 14)}deg`,
              animationDelay: `${index * 18}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ScoreCelebration({
  event,
  homeName,
  awayName,
}: {
  event: ScoreAnimationEvent | null;
  homeName: string;
  awayName: string;
}) {
  if (!event) {
    return null;
  }

  const isHome = event.side === "HOME";
  const teamName = isHome ? homeName : awayName;
  const isFootball = event.sport === "FOOTBALL";
  const title = isFootball ? "ГОООЛ!" : `+${event.delta}`;
  const subtitle = isFootball
    ? teamName
    : `${event.delta === 1 ? "ТОЧКА" : "ТОЧКИ"} · ${teamName}`;

  return (
    <div
      key={event.id}
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      aria-live="polite"
    >
      <div className="absolute inset-0 animate-[celebrationFlash_1700ms_ease-out_both] bg-[rgba(var(--sport-accent-rgb),0.22)]" />
      <div
        className={`absolute top-0 h-full w-[72%] animate-[celebrationSweep_1700ms_cubic-bezier(.2,.8,.2,1)_both] ${
          isHome
            ? "left-0 bg-gradient-to-r from-[rgba(var(--sport-secondary-rgb),0.78)] via-[rgba(var(--sport-accent-rgb),0.32)] to-transparent"
            : "right-0 bg-gradient-to-l from-[rgba(var(--sport-secondary-rgb),0.78)] via-[rgba(var(--sport-accent-rgb),0.32)] to-transparent"
        }`}
      />

      <CelebrationParticles sport={event.sport} />

      <div className="relative w-[min(52rem,88vw)] animate-[celebrationCard_1700ms_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#070B1A]/95 px-6 py-6 text-center shadow-[0_32px_100px_rgba(0,0,0,0.6)] backdrop-blur-xl md:rounded-[2.5rem] md:px-12 md:py-10">
        <div className="absolute inset-x-[14%] top-0 h-1.5 bg-gradient-to-r from-transparent via-[var(--sport-accent)] to-transparent md:h-2" />
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(var(--sport-accent-rgb),0.16)] blur-3xl md:h-96 md:w-96" />

        <p className="relative text-[clamp(3.3rem,10vw,9rem)] font-black uppercase leading-[0.8] tracking-[-0.07em] text-white drop-shadow-[0_0_35px_rgba(var(--sport-accent-rgb),0.35)]">
          {title}
        </p>
        <p className="relative mt-4 truncate text-[clamp(1rem,3vw,2.4rem)] font-black uppercase tracking-[0.07em] text-[var(--sport-accent)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  const themeStyle: ThemeVariables = {
    "--sport-accent": SPORT_THEME.FOOTBALL.accent,
    "--sport-accent-rgb": SPORT_THEME.FOOTBALL.accentRgb,
    "--sport-secondary": SPORT_THEME.FOOTBALL.secondary,
    "--sport-secondary-rgb": SPORT_THEME.FOOTBALL.secondaryRgb,
    "--score-color": SPORT_THEME.FOOTBALL.score,
  };

  return (
    <main
      style={themeStyle}
      className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-[#050817] p-4 text-white"
    >
      <ArenaBackground sport="FOOTBALL" />
      <div className="relative flex flex-col items-center text-center">
        <ScoreboardLogo />
        <Loader2 className="mt-7 h-8 w-8 animate-spin text-[var(--sport-accent)]" />
        <h1 className="mt-4 text-xl font-black uppercase tracking-[0.12em]">Зареждане</h1>
        <p className="mt-2 text-sm text-white/45">Свързване с мача...</p>
      </div>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const themeStyle: ThemeVariables = {
    "--sport-accent": SPORT_THEME.FOOTBALL.accent,
    "--sport-accent-rgb": SPORT_THEME.FOOTBALL.accentRgb,
    "--sport-secondary": SPORT_THEME.FOOTBALL.secondary,
    "--sport-secondary-rgb": SPORT_THEME.FOOTBALL.secondaryRgb,
    "--score-color": SPORT_THEME.FOOTBALL.score,
  };

  return (
    <main
      style={themeStyle}
      className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-[#050817] p-4 text-white"
    >
      <ArenaBackground sport="FOOTBALL" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-red-400/25 bg-[#0B1025]/90 p-7 text-center shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center">
          <ScoreboardLogo compact />
        </div>
        <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-300" />
        </div>
        <h1 className="mt-4 text-2xl font-black uppercase">Грешка</h1>
        <p className="mt-2 text-sm text-white/55">{message}</p>
      </div>
    </main>
  );
}

export function ScoreboardDisplay({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");
  const [scoreEvent, setScoreEvent] = useState<ScoreAnimationEvent | null>(null);

  const previousScoreRef = useRef<{
    matchId: string;
    home: number;
    away: number;
  } | null>(null);

  const remainingSeconds = useMatchCountdown(match);

  const sportMode: SportMode =
    match?.sport === "BASKETBALL" ? "BASKETBALL" : "FOOTBALL";

  const theme = SPORT_THEME[sportMode];
  const themeStyle: ThemeVariables = {
    "--sport-accent": theme.accent,
    "--sport-accent-rgb": theme.accentRgb,
    "--sport-secondary": theme.secondary,
    "--sport-secondary-rgb": theme.secondaryRgb,
    "--score-color": theme.score,
  };

  const homeScore = safeNumber(match?.homeScore);
  const awayScore = safeNumber(match?.awayScore);
  const homeFouls = safeNumber(match?.homeFouls);
  const awayFouls = safeNumber(match?.awayFouls);
  const homeCorners = safeNumber(match?.homeCorners);
  const awayCorners = safeNumber(match?.awayCorners);
  const homeTimeouts = safeNumber(match?.homeTimeouts);
  const awayTimeouts = safeNumber(match?.awayTimeouts);
  const currentHalf = Math.max(1, safeNumber(match?.currentHalf) || 1);
  const period = Math.max(1, safeNumber(match?.period) || 1);

  const possession: PossessionSide =
    match?.possession === "HOME" || match?.possession === "AWAY"
      ? match.possession
      : null;

  const timerRunning = match?.timerState === "RUNNING";
  const timerFinished = Boolean(match) && remainingSeconds <= 0;

  useEffect(() => {
    if (!match) {
      previousScoreRef.current = null;
      return;
    }

    const previous = previousScoreRef.current;

    if (!previous || previous.matchId !== match.id) {
      previousScoreRef.current = {
        matchId: match.id,
        home: homeScore,
        away: awayScore,
      };
      return;
    }

    const homeDelta = homeScore - previous.home;
    const awayDelta = awayScore - previous.away;

    previousScoreRef.current = {
      matchId: match.id,
      home: homeScore,
      away: awayScore,
    };

    let nextEvent: ScoreAnimationEvent | null = null;

    if (homeDelta > 0) {
      nextEvent = {
        id: Date.now(),
        side: "HOME",
        delta: homeDelta,
        sport: sportMode,
      };
    } else if (awayDelta > 0) {
      nextEvent = {
        id: Date.now(),
        side: "AWAY",
        delta: awayDelta,
        sport: sportMode,
      };
    }

    if (!nextEvent) {
      return;
    }

    setScoreEvent(nextEvent);

    const timeoutId = window.setTimeout(() => {
      setScoreEvent((current) => (current?.id === nextEvent.id ? null : current));
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [match, homeScore, awayScore, sportMode]);

  useEffect(() => {
    setMatch(null);
    setError("");
    setScoreEvent(null);
    previousScoreRef.current = null;

    if (!matchId) {
      setError("Липсва идентификатор на мача.");
      return;
    }

    const unsubscribe = listenToMatch(
      matchId,
      (nextMatch) => {
        setMatch(nextMatch);
        setError(nextMatch ? "" : "Мачът не е намерен.");
      },
      (listenError) => {
        console.error("Failed to listen to match:", listenError);
        setError(listenError.message || "Неуспешно зареждане на мача.");
      },
    );

    return unsubscribe;
  }, [matchId]);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!match) {
    return <LoadingScreen />;
  }

  const homeStats: TeamStat[] =
    sportMode === "BASKETBALL"
      ? [
          { label: "Фалове", value: homeFouls },
          { label: "Таймаути", value: homeTimeouts },
        ]
      : [
          { label: "Фалове", value: homeFouls },
          { label: "Корнери", value: homeCorners },
        ];

  const awayStats: TeamStat[] =
    sportMode === "BASKETBALL"
      ? [
          { label: "Фалове", value: awayFouls },
          { label: "Таймаути", value: awayTimeouts },
        ]
      : [
          { label: "Фалове", value: awayFouls },
          { label: "Корнери", value: awayCorners },
        ];

  return (
    <main
      style={themeStyle}
      data-sport={sportMode}
      className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#050817] text-white"
    >
      <style>{`
        @keyframes scorePop {
          0% { transform: scale(1); filter: brightness(1); }
          28% { transform: scale(1.13); filter: brightness(1.35); }
          62% { transform: scale(0.985); }
          100% { transform: scale(1); filter: brightness(1); }
        }

        @keyframes criticalTimer {
          0%, 100% { opacity: 1; text-shadow: 0 0 0 rgba(248,113,113,0); }
          50% { opacity: .72; text-shadow: 0 0 28px rgba(248,113,113,.4); }
        }

        @keyframes celebrationFlash {
          0% { opacity: 0; }
          12% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes celebrationSweep {
          0% { opacity: 0; transform: translateX(-18%) skewX(-8deg); }
          22% { opacity: 1; transform: translateX(0) skewX(-8deg); }
          78% { opacity: .72; }
          100% { opacity: 0; transform: translateX(10%) skewX(-8deg); }
        }

        @keyframes celebrationCard {
          0% { opacity: 0; transform: scale(.78) translateY(22px); }
          18% { opacity: 1; transform: scale(1.035) translateY(0); }
          34% { transform: scale(1); }
          82% { opacity: 1; }
          100% { opacity: 0; transform: scale(.98) translateY(-8px); }
        }

        @keyframes particleBurst {
          0% { opacity: 0; transform: rotate(var(--rotation, 0deg)) translateX(3rem) scaleX(.2); }
          18% { opacity: 1; }
          78% { opacity: .85; }
          100% { opacity: 0; transform: rotate(var(--rotation, 0deg)) translateX(26rem) scaleX(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <ArenaBackground sport={sportMode} />
      <MatchTopBar sport={sportMode} />

      <ScoreCelebration
        event={scoreEvent}
        homeName={match.homeTeamName}
        awayName={match.awayTeamName}
      />

      <div className="relative z-10 min-h-0 flex-1 p-2 md:p-5">
        <section className="mx-auto grid h-full min-h-0 w-full max-w-[1920px] grid-cols-[minmax(0,1fr)_8.7rem_minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_19rem_minmax(0,1fr)] md:gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem_minmax(0,1fr)]">
          <TeamSide
            side="HOME"
            name={match.homeTeamName}
            score={homeScore}
            stats={homeStats}
            sport={sportMode}
            possession={sportMode === "BASKETBALL" && possession === "HOME"}
            celebrating={scoreEvent?.side === "HOME"}
          />

          <CenterControl
            sport={sportMode}
            currentHalf={currentHalf}
            period={period}
            possession={possession}
            remainingSeconds={remainingSeconds}
            timerRunning={timerRunning}
            timerFinished={timerFinished}
            timerState={match.timerState}
          />

          <TeamSide
            side="AWAY"
            name={match.awayTeamName}
            score={awayScore}
            stats={awayStats}
            sport={sportMode}
            possession={sportMode === "BASKETBALL" && possession === "AWAY"}
            celebrating={scoreEvent?.side === "AWAY"}
          />
        </section>
      </div>
    </main>
  );
}
