/*
  Event lifecycle: upcoming, in progress, ended, and the countdown to the start.

  Pure functions over absolute instants (milliseconds since the epoch), with no imports, so the
  same code runs at build time (the page's first state) and in the small browser script that keeps
  it current. An instant does not depend on any timezone or on daylight saving, so a countdown
  computed from two instants is correct for every recorded timezone. The recorded timezone only
  controls how the page writes the date and time; it is not used here.

  The semantics are the site's existing ones (eventsContent.ts `classify`): an event is over after
  its end, or after its start when the record has no end. So:
  - before the start: upcoming (countdown);
  - from the start up to and including the end: in progress ("Happening now");
  - after the end: ended.
  An event without an end therefore goes from its countdown straight to "Ended" once its start has
  passed: it is in progress only at the single instant of its start. This is the existing rule, not
  a new one; the club has not said how long an event with no end lasts.
*/

export type Lifecycle = "upcoming" | "in-progress" | "ended";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** The longest wait the script schedules in one step, so a sleeping tab or a long wait resyncs. */
const MAX_WAIT = HOUR;
/** The shortest wait, so a timer that fires a few milliseconds early cannot spin. */
const MIN_WAIT = 50;

export const STATUS_LABEL: Record<Lifecycle, string> = {
  upcoming: "Upcoming",
  "in-progress": "Happening now",
  ended: "Ended",
};

/** The instant an event is over: its end, or its start when it has none. Null if the times are invalid. */
function endInstant(startMs: number, endMs: number | undefined): number | null {
  if (!Number.isFinite(startMs)) return null;
  if (endMs === undefined || Number.isNaN(endMs)) return startMs; // no usable end: over at the start
  if (!Number.isFinite(endMs) || endMs < startMs) return null; // an end before the start is invalid
  return endMs;
}

/**
 * The state of an event at `nowMs`. Null when the start or end is not a valid instant (an end
 * before the start is invalid), so invalid data is never treated as a real state.
 */
export function lifecycleOf(
  startMs: number,
  endMs: number | undefined,
  nowMs: number,
): Lifecycle | null {
  const end = endInstant(startMs, endMs);
  if (end === null || !Number.isFinite(nowMs)) return null;
  if (nowMs < startMs) return "upcoming";
  if (nowMs <= end) return "in-progress";
  return "ended";
}

/** Whole time left, in the units shown. Never negative. */
export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Time left as days, hours and minutes of elapsed time (a day is 24 hours, which is what a
 * countdown means across a daylight saving change). Minutes round up, so zero appears only at
 * the start. Negative or invalid input gives zeros.
 */
export function countdownParts(remainingMs: number): CountdownParts {
  const total = Number.isFinite(remainingMs) ? Math.max(0, Math.ceil(remainingMs / MINUTE)) : 0;
  return {
    days: Math.floor(total / (24 * 60)),
    hours: Math.floor((total % (24 * 60)) / 60),
    minutes: total % 60,
  };
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * A readable countdown: "3 days, 4 hours", "2 hours, 5 minutes", "7 minutes", or "less than a
 * minute". Days show days and hours; under a day, hours and minutes; under an hour, minutes.
 */
export function formatCountdown(remainingMs: number): string {
  if (!(remainingMs > MINUTE)) return "less than a minute";
  const { days, hours, minutes } = countdownParts(remainingMs);
  if (days > 0) {
    return hours > 0 ? `${plural(days, "day")}, ${plural(hours, "hour")}` : plural(days, "day");
  }
  if (hours > 0) {
    return minutes > 0
      ? `${plural(hours, "hour")}, ${plural(minutes, "minute")}`
      : plural(hours, "hour");
  }
  return plural(minutes, "minute");
}

/** The status sentence for the page: the label, and the countdown while upcoming. */
export function countdownSentence(startMs: number, nowMs: number): string {
  return `Starts in ${formatCountdown(startMs - nowMs)}`;
}

/**
 * Milliseconds until the page text next needs to change, or null when it never will (ended or
 * invalid). The text changes at each whole minute of the countdown, at the start, and just after
 * the end. A wait is capped so a long wait still resyncs, and is never shorter than a few
 * milliseconds.
 */
export function msUntilChange(
  startMs: number,
  endMs: number | undefined,
  nowMs: number,
): number | null {
  const state = lifecycleOf(startMs, endMs, nowMs);
  if (state === null || state === "ended") return null;
  const end = endInstant(startMs, endMs) as number;
  let wait: number;
  if (state === "upcoming") {
    const remaining = startMs - nowMs;
    const minutesLeft = Math.ceil(remaining / MINUTE);
    // The shown minute count drops when the remaining time falls to (minutesLeft - 1) minutes.
    wait = minutesLeft > 1 ? remaining - (minutesLeft - 1) * MINUTE : remaining;
  } else {
    wait = end - nowMs + 1; // it is over once the clock passes the end
  }
  return Math.min(MAX_WAIT, Math.max(MIN_WAIT, wait));
}
