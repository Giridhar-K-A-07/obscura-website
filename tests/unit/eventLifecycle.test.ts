import { describe, expect, it } from "vitest";
import {
  STATUS_LABEL,
  countdownParts,
  countdownSentence,
  formatCountdown,
  lifecycleOf,
  msUntilChange,
} from "../../src/lib/eventLifecycle";
import { classify, selectPublicEvents } from "../../src/lib/eventsContent";

/*
  Synthetic times for tests only. They are not club data and never leave this file.
*/
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const at = (iso: string) => Date.parse(iso);

const START = at("2030-07-01T10:00:00Z");
const END = at("2030-07-01T12:00:00Z");

describe("lifecycle states", () => {
  it("is upcoming before the start", () => {
    expect(lifecycleOf(START, END, START - 1)).toBe("upcoming");
    expect(lifecycleOf(START, END, START - DAY)).toBe("upcoming");
  });

  it("is in progress at the exact start", () => {
    expect(lifecycleOf(START, END, START)).toBe("in-progress");
  });

  it("is in progress between the start and the end", () => {
    expect(lifecycleOf(START, END, START + HOUR)).toBe("in-progress");
  });

  it("is still in progress at the exact end, and ended one millisecond later", () => {
    expect(lifecycleOf(START, END, END)).toBe("in-progress");
    expect(lifecycleOf(START, END, END + 1)).toBe("ended");
  });

  it("is ended long after the end", () => {
    expect(lifecycleOf(START, END, END + 100 * DAY)).toBe("ended");
  });

  it("labels each state in words", () => {
    expect(STATUS_LABEL).toEqual({
      upcoming: "Upcoming",
      "in-progress": "Happening now",
      ended: "Ended",
    });
  });
});

describe("events without an end follow the existing rule: over at the start", () => {
  it("is upcoming before the start", () => {
    expect(lifecycleOf(START, undefined, START - 1)).toBe("upcoming");
  });

  it("is in progress only at the instant of the start, then ended", () => {
    expect(lifecycleOf(START, undefined, START)).toBe("in-progress");
    expect(lifecycleOf(START, undefined, START + 1)).toBe("ended");
  });

  it("treats an end equal to the start the same way", () => {
    expect(lifecycleOf(START, START, START)).toBe("in-progress");
    expect(lifecycleOf(START, START, START + 1)).toBe("ended");
  });

  it("treats an unusable (NaN) end as no end, as the event selector does", () => {
    expect(lifecycleOf(START, Number.NaN, START + 1)).toBe("ended");
  });
});

describe("invalid data is not treated as a real state", () => {
  it("returns null for an invalid start, an end before the start, or an invalid clock", () => {
    expect(lifecycleOf(Number.NaN, END, START)).toBeNull();
    expect(lifecycleOf(Number.POSITIVE_INFINITY, undefined, START)).toBeNull();
    expect(lifecycleOf(START, START - 1, START)).toBeNull();
    expect(lifecycleOf(START, Number.POSITIVE_INFINITY, START)).toBeNull();
    expect(lifecycleOf(START, END, Number.NaN)).toBeNull();
  });

  it("schedules nothing for invalid data or an ended event", () => {
    expect(msUntilChange(Number.NaN, END, START)).toBeNull();
    expect(msUntilChange(START, START - 1, START)).toBeNull();
    expect(msUntilChange(START, END, END + 1)).toBeNull();
  });
});

describe("agreement with the site's existing classification", () => {
  const record = (extra: Record<string, unknown>) =>
    ({
      id: "a",
      data: {
        source: "test",
        status: "verified",
        title: "Test event",
        type: "Test type",
        start: new Date(START),
        timezone: "Asia/Kolkata",
        venue: "Test venue",
        speakers: [],
        photos: [],
        slides: [],
        repositories: [],
        ...extra,
      },
    }) as never;

  it("calls an event past exactly when it is ended, with and without an end", () => {
    const withEnd = selectPublicEvents([record({ end: new Date(END) })], [], new Date(0))[0];
    const noEnd = selectPublicEvents([record({})], [], new Date(0))[0];
    const times = [START - DAY, START - 1, START, START + 1, END - 1, END, END + 1, END + DAY];
    for (const t of times) {
      for (const [event, end] of [
        [withEnd, END],
        [noEnd, undefined],
      ] as const) {
        const ended = lifecycleOf(START, end, t) === "ended";
        expect(classify(event, new Date(t))).toBe(ended ? "past" : "upcoming");
      }
    }
  });
});

describe("timezones and daylight saving", () => {
  it("counts down to the absolute instant, whatever the recorded timezone", () => {
    // 15:30 in India (UTC+05:30) is 10:00 UTC, so one hour before is 09:00 UTC.
    const start = at("2030-07-01T15:30:00+05:30");
    expect(start).toBe(at("2030-07-01T10:00:00Z"));
    expect(formatCountdown(start - at("2030-07-01T09:00:00Z"))).toBe("1 hour");
    // The same instant written in New York (UTC-04:00) gives the same countdown.
    const sameInstant = at("2030-07-01T06:00:00-04:00");
    expect(sameInstant).toBe(start);
    expect(formatCountdown(sameInstant - at("2030-07-01T09:00:00Z"))).toBe("1 hour");
  });

  it("uses elapsed time across a daylight saving start, not wall-clock hours", () => {
    // New York moves clocks forward at 02:00 on 10 March 2030 (UTC-05:00 to UTC-04:00). Noon on
    // the 9th and noon on the 10th are 23 hours apart, not 24.
    const start = at("2030-03-10T12:00:00-04:00");
    const now = at("2030-03-09T12:00:00-05:00");
    expect(start - now).toBe(23 * HOUR);
    expect(formatCountdown(start - now)).toBe("23 hours");
  });

  it("uses elapsed time across a daylight saving end", () => {
    // Clocks go back at 02:00 on 3 November 2030 (UTC-04:00 to UTC-05:00): 25 hours that day.
    const start = at("2030-11-03T12:00:00-05:00");
    const now = at("2030-11-02T12:00:00-04:00");
    expect(start - now).toBe(25 * HOUR);
    expect(formatCountdown(start - now)).toBe("1 day, 1 hour");
  });

  it("keeps the state change at the right instant across a daylight saving change", () => {
    const start = at("2030-03-10T03:00:00-04:00"); // the first hour after the clocks move
    expect(lifecycleOf(start, undefined, at("2030-03-10T06:59:59Z"))).toBe("upcoming");
    expect(lifecycleOf(start, undefined, at("2030-03-10T07:00:00Z"))).toBe("in-progress");
  });
});

describe("countdown", () => {
  it("splits time left into days, hours and minutes", () => {
    expect(countdownParts(3 * DAY + 4 * HOUR + 5 * MINUTE)).toEqual({
      days: 3,
      hours: 4,
      minutes: 5,
    });
    expect(countdownParts(59 * MINUTE)).toEqual({ days: 0, hours: 0, minutes: 59 });
  });

  it("rounds a part-minute up, so zero appears only at the start", () => {
    expect(countdownParts(1)).toEqual({ days: 0, hours: 0, minutes: 1 });
    expect(countdownParts(MINUTE + 1)).toEqual({ days: 0, hours: 0, minutes: 2 });
  });

  it("never goes negative, and ignores invalid input", () => {
    expect(countdownParts(-5 * MINUTE)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(countdownParts(Number.NaN)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(formatCountdown(-1)).toBe("less than a minute");
    expect(formatCountdown(0)).toBe("less than a minute");
    expect(formatCountdown(Number.NaN)).toBe("less than a minute");
    expect(formatCountdown(-DAY)).not.toMatch(/-/);
  });

  it("formats deterministically in readable units", () => {
    expect(formatCountdown(30_000)).toBe("less than a minute");
    expect(formatCountdown(MINUTE)).toBe("less than a minute");
    expect(formatCountdown(MINUTE + 1)).toBe("2 minutes");
    expect(formatCountdown(7 * MINUTE)).toBe("7 minutes");
    expect(formatCountdown(HOUR)).toBe("1 hour");
    expect(formatCountdown(2 * HOUR + 5 * MINUTE)).toBe("2 hours, 5 minutes");
    expect(formatCountdown(HOUR + MINUTE)).toBe("1 hour, 1 minute");
    expect(formatCountdown(DAY)).toBe("1 day");
    expect(formatCountdown(3 * DAY + 4 * HOUR + 30 * MINUTE)).toBe("3 days, 4 hours");
    expect(formatCountdown(2 * DAY)).toBe("2 days");
    expect(formatCountdown(3 * DAY + 4 * HOUR)).toBe(formatCountdown(3 * DAY + 4 * HOUR));
  });

  it("writes the sentence from the start and the clock", () => {
    expect(countdownSentence(START, START - 2 * DAY)).toBe("Starts in 2 days");
    expect(countdownSentence(START, START - 30_000)).toBe("Starts in less than a minute");
  });
});

describe("scheduling the next update", () => {
  it("waits for the next whole minute of the countdown", () => {
    // 5 minutes 20 seconds left: shown as "6 minutes" until 5 minutes remain, 20 seconds from now.
    expect(msUntilChange(START, END, START - (5 * MINUTE + 20_000))).toBe(20_000);
    // Exactly 5 minutes left: the next change is a minute later.
    expect(msUntilChange(START, END, START - 5 * MINUTE)).toBe(MINUTE);
  });

  it("waits for the start when under two minutes remain", () => {
    expect(msUntilChange(START, END, START - 45_000)).toBe(45_000);
  });

  it("waits until just after the end while in progress", () => {
    expect(msUntilChange(START, END, START + 10 * MINUTE)).toBe(HOUR); // capped at an hour
    expect(msUntilChange(START, END, END - 1000)).toBe(1001);
  });

  it("caps long waits at an hour, and never schedules a tiny wait", () => {
    expect(msUntilChange(START, END, START - 30 * DAY)).toBeLessThanOrEqual(HOUR);
    expect(msUntilChange(START, END, START - 1)).toBeGreaterThanOrEqual(50);
  });

  it("never schedules a negative or zero wait", () => {
    for (const t of [START - DAY, START - 1, START, START + 1, END - 1, END]) {
      const wait = msUntilChange(START, END, t);
      expect(wait).not.toBeNull();
      expect(wait as number).toBeGreaterThan(0);
    }
  });
});
