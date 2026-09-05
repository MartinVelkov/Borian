"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Clock3,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  setMatchStatus,
  updateMatchControlStats,
  updateMatchTimer,
} from "@/lib/firestore-service";
import {
  formatCountdown,
  getHalfDuration,
  getTimerRemainingSeconds,
} from "@/lib/match-timer";
import type { Match } from "@/lib/types";

function useMatchCountdown(match: Match) {
  const [remainingSeconds, setRemainingSeconds] =
    useState(() =>
      getTimerRemainingSeconds(match),
    );

  useEffect(() => {
    function updateCountdown() {
      setRemainingSeconds(
        getTimerRemainingSeconds(match),
      );
    }

    updateCountdown();

    if (match.timerState !== "RUNNING") {
      return;
    }

    const intervalId = window.setInterval(
      updateCountdown,
      250,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    match.id,
    match.timerState,
    match.timerEndsAt,
    match.timerRemainingSeconds,
    match.halfDurationSeconds,
    match.currentHalf,
  ]);

  return remainingSeconds;
}

export function MatchTimerControl({
  match,
  disabled = false,
}: {
  match: Match;
  disabled?: boolean;
}) {
  const [isEditingRemaining, setIsEditingRemaining] =
    useState(false);

  const [editRemainingValue, setEditRemainingValue] =
    useState("");

  function formatSecondsForInput(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function parseTimeString(value: string) {
    const v = value.trim();
    // mm:ss or seconds
    const mmss = v.match(/^(\d+):([0-5]?\d)$/);
    if (mmss) {
      const m = parseInt(mmss[1], 10);
      const s = parseInt(mmss[2], 10);
      return m * 60 + s;
    }

    const num = Number(v);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return Math.max(0, Math.floor(num));
    }

    return null;
  }
  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const remainingSeconds =
    useMatchCountdown(match);

  const halfDuration =
    getHalfDuration(match);

  const currentHalf =
    match.currentHalf ?? 1;

  const isRunning =
    match.timerState === "RUNNING";

  const isBusy =
    saving || disabled;

  const timerIsFinished =
    remainingSeconds <= 0;

  const canEditRemaining = !isBusy;

  async function startTimer() {
    if (
      isBusy ||
      isRunning ||
      remainingSeconds <= 0
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateMatchTimer(
        match.id,
        {
          currentHalf,
          halfDurationSeconds:
            halfDuration,

          timerRemainingSeconds:
            remainingSeconds,

          timerState: "RUNNING",

          timerEndsAt: new Date(
            Date.now() +
              remainingSeconds * 1000,
          ).toISOString(),
        },
      );

      if (match.status !== "LIVE") {
        await setMatchStatus(
          match.id,
          "LIVE",
        );
      }
    } catch (error) {
      console.error(
        "Failed to start timer:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Таймерът не можа да бъде стартиран.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function pauseTimer() {
    if (
      isBusy ||
      !isRunning
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateMatchTimer(
        match.id,
        {
          timerRemainingSeconds:
            remainingSeconds,

          timerState: "PAUSED",
          timerEndsAt: null,
        },
      );
    } catch (error) {
      console.error(
        "Failed to pause timer:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Таймерът не можа да бъде паузиран.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetCurrentHalf() {
    if (isBusy) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateMatchTimer(
        match.id,
        {
          currentHalf,
          halfDurationSeconds:
            halfDuration,

          timerRemainingSeconds:
            halfDuration,

          timerState: "STOPPED",
          timerEndsAt: null,
        },
      );
    } catch (error) {
      console.error(
        "Failed to reset timer:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Таймерът не можа да бъде нулиран.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function startSecondHalf() {
    if (
      isBusy ||
      currentHalf === 2
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      /*
       * Първо подготвяме таймера
       * за второто полувреме.
       */
      await updateMatchTimer(
        match.id,
        {
          currentHalf: 2,

          halfDurationSeconds:
            halfDuration,

          timerRemainingSeconds:
            halfDuration,

          timerState: "STOPPED",
          timerEndsAt: null,
        },
      );

      /*
       * След това нулираме
       * статистиките, които искаме
       * да започнат от 0 през
       * второто полувреме.
       */
      await updateMatchControlStats(
        match.id,
        {
          homeFouls: 0,
          awayFouls: 0,
          homeCorners: 0,
          awayCorners: 0,
        },
      );
    } catch (error) {
      console.error(
        "Failed to prepare second half:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Второто полувреме не можа да бъде подготвено.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex flex-col gap-5 border-b bg-muted/30 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background shadow-sm">
            <Clock3 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Управление на времето
            </p>

            <h3 className="mt-1 text-lg font-bold">
              {currentHalf === 1
                ? "Първо полувреме"
                : "Второ полувреме"}
            </h3>
          </div>
        </div>

        <div
          onClick={() => {
            if (!canEditRemaining) return;
            setIsEditingRemaining(true);
            setEditRemainingValue(
              formatSecondsForInput(remainingSeconds),
            );
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (!canEditRemaining) return;
              setIsEditingRemaining(true);
              setEditRemainingValue(
                formatSecondsForInput(remainingSeconds),
              );
            }
            if (e.key === "Escape") {
              setIsEditingRemaining(false);
            }
          }}
          className={`rounded-xl border bg-background px-6 py-3 text-center shadow-sm ${
            timerIsFinished
              ? "border-destructive/40 text-destructive"
              : ""
          } cursor-pointer`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Оставащо време
          </p>

          {!isEditingRemaining ? (
            <p className="mt-1 text-4xl font-black tabular-nums tracking-tight">
              {formatCountdown(remainingSeconds)}
            </p>
          ) : (
            <div className="mt-1 flex items-center justify-center gap-2">
              <input
                className="w-28 rounded-md border px-2 py-1 text-center text-2xl font-black tabular-nums"
                value={editRemainingValue}
                onChange={(e) =>
                  setEditRemainingValue(e.target.value)
                }
                onKeyDown={async (e) => {
                  if (e.key === "Escape") {
                    setIsEditingRemaining(false);
                    return;
                  }

                  if (e.key === "Enter") {
                    const parsed = parseTimeString(
                      editRemainingValue,
                    );

                    if (parsed === null) return;

                    setSaving(true);
                    setMessage("");

                    try {
                      const update: any = {
                        timerRemainingSeconds: parsed,
                      };

                      if (match.timerState === "RUNNING") {
                        update.timerEndsAt = new Date(
                          Date.now() + parsed * 1000,
                        ).toISOString();
                      } else {
                        update.timerEndsAt = null;
                      }

                      await updateMatchTimer(match.id, update);
                    } catch (error) {
                      console.error(
                        "Failed to update remaining time:",
                        error,
                      );
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Оставащото време не можа да бъде записано.",
                      );
                    } finally {
                      setSaving(false);
                      setIsEditingRemaining(false);
                    }
                  }
                }}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Button
          type="button"
          disabled={
            isBusy ||
            isRunning ||
            timerIsFinished
          }
          onClick={() =>
            void startTimer()
          }
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}

          Старт
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={
            isBusy ||
            !isRunning
          }
          onClick={() =>
            void pauseTimer()
          }
        >
          <Pause className="mr-2 h-4 w-4" />
          Пауза
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() =>
            void resetCurrentHalf()
          }
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Нулирай
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={
            isBusy ||
            currentHalf === 2
          }
          onClick={() =>
            void startSecondHalf()
          }
        >
          <SkipForward className="mr-2 h-4 w-4" />
          Второ полувреме
        </Button>
      </div>

      {message && (
        <div
          role="alert"
          className="border-t border-destructive/20 bg-destructive/5 px-5 py-3 text-sm text-destructive"
        >
          {message}
        </div>
      )}
    </section>
  );
}