import type { Match } from "@/lib/types";

export const DEFAULT_HALF_DURATION_SECONDS = 5 * 60;

function getEndTimeMilliseconds(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();

    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  return null;
}

export function getHalfDuration(match: Match) {
  const duration = Number(match.halfDurationSeconds);

  if (Number.isFinite(duration) && duration > 0) {
    return Math.floor(duration);
  }

  return DEFAULT_HALF_DURATION_SECONDS;
}

export function getTimerRemainingSeconds(
  match: Match,
  now = Date.now(),
) {
  const fallbackSeconds = Number.isFinite(
    match.timerRemainingSeconds,
  )
    ? Math.max(0, Number(match.timerRemainingSeconds))
    : getHalfDuration(match);

  if (match.timerState !== "RUNNING") {
    return Math.floor(fallbackSeconds);
  }

  const endTime = getEndTimeMilliseconds(match.timerEndsAt);

  if (endTime === null) {
    return Math.floor(fallbackSeconds);
  }

  return Math.max(
    0,
    Math.ceil((endTime - now) / 1000),
  );
}

export function formatCountdown(totalSeconds: number) {
  const normalizedSeconds = Math.max(
    0,
    Math.floor(totalSeconds),
  );

  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
}