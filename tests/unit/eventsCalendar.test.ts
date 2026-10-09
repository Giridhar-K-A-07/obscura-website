import { describe, expect, it } from "vitest";
import {
  buildEventCalendar,
  calendarRoutes,
  calendarUid,
  escapeText,
  foldLine,
  offersCalendar,
  utcStamp,
} from "../../src/lib/eventsCalendar";
import {
  calendarPath,
  eventPath,
  selectEventsContent,
  selectPublicEvents,
  type PublicEvent,
} from "../../src/lib/eventsContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
*/
const NEEDED = "[[NEEDED: something]]";
const NOW = new Date("2030-06-15T12:00:00Z");
const STAMP = "20300615T120000Z";

const entry = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const record = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  entry(id, {
    status,
    title: `Test event ${id}`,
    type: "Test type",
    start: new Date("2030-07-01T10:00:00Z"),
    timezone: "Asia/Kolkata",
    venue: "Test venue",
    speakers: [],
    photos: [],
    slides: [],
    repositories: [],
    ...extra,
  });

/** The one public event the rule publishes for a record, or undefined. */
const publish = (rec: never): PublicEvent | undefined => selectPublicEvents([rec], [], NOW)[0];
const build = (id: string, extra: Record<string, unknown> = {}, now = NOW) => {
  const event = publish(record(id, extra));
  if (!event) throw new Error("fixture was not published");
  return buildEventCalendar(event, now);
};
const lines = (text: string) => text.split("\r\n");
/** Undo folding: a CRLF followed by a space joins the lines. */
const unfold = (text: string) => text.replace(/\r\n /g, "");

describe("a valid event", () => {
  it("has exactly the expected calendar structure", () => {
    const ics = build("a", {
      end: new Date("2030-07-01T12:30:00Z"),
      description: "Test description",
    });
    expect(ics).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//OBSCURA//OBSCURA//EN",
        "BEGIN:VEVENT",
        "UID:obscura-event-a",
        `DTSTAMP:${STAMP}`,
        "DTSTART:20300701T100000Z",
        "DTEND:20300701T123000Z",
        "SUMMARY:Test event a",
        "LOCATION:Test venue",
        "DESCRIPTION:Test description",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });

  it("has one calendar and one event, and ends with a CRLF", () => {
    const ics = build("a");
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("omits the description when the record has none, and never invents other fields", () => {
    const ics = build("a");
    expect(ics).not.toContain("DESCRIPTION");
    for (const property of [
      "URL",
      "ORGANIZER",
      "GEO",
      "DURATION",
      "ATTENDEE",
      "TZID",
      "VTIMEZONE",
      "CATEGORIES",
    ]) {
      expect(ics).not.toContain(property);
    }
  });

  it("includes no speaker, photo, slide, repository or recap", () => {
    const ics = build("a", {
      speakers: ["Test Speaker"],
      photos: ["/events/test-photo.jpg"],
      slides: ["https://example.com/test-slides"],
      repositories: ["https://example.com/test-repo"],
      relatedPost: "test-post",
    });
    for (const text of ["Test Speaker", "test-photo", "test-slides", "test-repo", "test-post"]) {
      expect(ics).not.toContain(text);
    }
  });

  it("is deterministic: the same event and time give the same text", () => {
    expect(build("a")).toBe(build("a"));
  });

  it("changes only DTSTAMP when the injected time changes", () => {
    const other = new Date("2031-01-02T03:04:05Z");
    const first = build("a");
    const second = build("a", {}, other);
    expect(second).not.toBe(first);
    expect(second.replace("DTSTAMP:20310102T030405Z", `DTSTAMP:${STAMP}`)).toBe(first);
  });
});

describe("uid", () => {
  it("is derived from the record id alone", () => {
    expect(calendarUid("a")).toBe("obscura-event-a");
    expect(build("workshop-1")).toContain("UID:obscura-event-workshop-1\r\n");
  });

  it("is stable when the content changes, and differs between events", () => {
    const uid = (ics: string) => lines(ics).find((l) => l.startsWith("UID:"));
    expect(uid(build("a", { title: "Changed title" }))).toBe(uid(build("a")));
    expect(uid(build("b"))).not.toBe(uid(build("a")));
  });
});

describe("time", () => {
  it("writes Asia/Kolkata instants as the correct UTC time", () => {
    // 15:30 in India (UTC+05:30) is 10:00 UTC.
    const ics = build("a", {
      start: new Date("2030-07-01T15:30:00+05:30"),
      end: new Date("2030-07-01T17:00:00+05:30"),
    });
    expect(ics).toContain("DTSTART:20300701T100000Z\r\n");
    expect(ics).toContain("DTEND:20300701T113000Z\r\n");
  });

  it("depends only on the instant, not on the recorded timezone", () => {
    const start = new Date("2030-07-01T10:00:00Z");
    const zones = ["Asia/Kolkata", "America/New_York", "Pacific/Auckland", "UTC"];
    const outputs = zones.map((timezone) => build("a", { start, timezone }));
    expect(new Set(outputs).size).toBe(1);
    expect(outputs[0]).toContain("DTSTART:20300701T100000Z");
  });

  it("converts across a date change", () => {
    const ics = build("a", { start: new Date("2030-07-01T00:15:00+05:30") });
    expect(ics).toContain("DTSTART:20300630T184500Z\r\n");
  });

  it("writes UTC times and never a local time or a zone name", () => {
    const ics = build("a", { end: new Date("2030-07-01T12:00:00Z") });
    for (const row of lines(ics).filter((l) => /^DT(START|END|STAMP)/.test(l))) {
      expect(row).toMatch(/^DT(START|END|STAMP):\d{8}T\d{6}Z$/);
    }
    expect(ics).not.toContain("Kolkata");
  });

  it("formats an instant", () => {
    expect(utcStamp(new Date("2030-01-02T03:04:05.678Z"))).toBe("20300102T030405Z");
  });
});

describe("end time", () => {
  it("has no DTEND when the record has no end", () => {
    expect(build("a")).not.toContain("DTEND");
  });

  it("has no DTEND when the end equals the start", () => {
    expect(build("a", { end: new Date("2030-07-01T10:00:00Z") })).not.toContain("DTEND");
  });

  it("has a DTEND when the end is later than the start, and never invents a duration", () => {
    const ics = build("a", { end: new Date("2030-07-01T10:00:01Z") });
    expect(ics).toContain("DTEND:20300701T100001Z");
    expect(ics).not.toContain("DURATION");
  });

  it("produces no calendar for an event whose end is before its start", () => {
    const bad = record("a", { end: new Date("2030-07-01T09:00:00Z") });
    expect(publish(bad)).toBeUndefined();
    expect(calendarRoutes(selectEventsContent({ events: [bad], posts: [] }, NOW).all, NOW)).toEqual(
      [],
    );
  });

  it("never writes a DTEND that is not after the start, even if given one directly", () => {
    const event = publish(record("a")) as PublicEvent;
    const reversed = { ...event, end: new Date("2030-07-01T09:00:00Z") };
    expect(buildEventCalendar(reversed, NOW)).not.toContain("DTEND");
  });
});

describe("text escaping", () => {
  it("escapes backslash, comma, semicolon and newline", () => {
    expect(escapeText("a\\b")).toBe("a\\\\b");
    expect(escapeText("a,b")).toBe("a\\,b");
    expect(escapeText("a;b")).toBe("a\\;b");
    expect(escapeText("a\nb")).toBe("a\\nb");
    expect(escapeText("a\r\nb")).toBe("a\\nb");
    expect(escapeText("a\rb")).toBe("a\\nb");
    expect(escapeText("a\u2028b\u2029c\u0085d")).toBe("a\\nb\\nc\\nd");
  });

  it("escapes the backslash first, so an escape is not escaped twice", () => {
    expect(escapeText("\\,")).toBe("\\\\\\,");
  });

  it("removes control characters but keeps tabs", () => {
    expect(escapeText("a\u0000b\u0007c\u001Bd\u007Fe\tf")).toBe("abcde\tf");
  });

  it("writes special characters in the title, venue and description", () => {
    const ics = build("a", {
      title: "A, B; C \\ D",
      venue: "Room 1, Block; 2",
      description: "Line one\nLine two",
    });
    expect(ics).toContain("SUMMARY:A\\, B\\; C \\\\ D\r\n");
    expect(ics).toContain("LOCATION:Room 1\\, Block\\; 2\r\n");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two\r\n");
  });

  it("keeps non-ASCII text intact", () => {
    const ics = build("a", { title: "Café Ünïcode 数据 🎓", venue: "Zürich · हॉल" });
    expect(unfold(ics)).toContain("SUMMARY:Café Ünïcode 数据 🎓\r\n");
    expect(unfold(ics)).toContain("LOCATION:Zürich · हॉल\r\n");
  });
});

describe("property injection", () => {
  const attempts = [
    "Test\r\nURL:https://example.com/evil",
    "Test\nATTENDEE:mailto:a@example.com",
    "Test\rEND:VEVENT\rBEGIN:VEVENT",
    "Test\u2028ORGANIZER:x",
    "Test\u0085BEGIN:VALARM",
  ];
  const properties = (ics: string) => lines(ics).filter(Boolean);

  it("cannot add a property or a line through the title, venue or description", () => {
    for (const attempt of attempts) {
      const ics = build("a", { title: attempt, venue: attempt, description: attempt });
      expect(properties(ics)).toHaveLength(12);
      expect(lines(ics).filter((l) => l.startsWith("URL"))).toEqual([]);
      for (const name of ["URL", "ATTENDEE", "ORGANIZER", "BEGIN:VALARM"]) {
        expect(lines(unfold(ics)).some((l) => l.startsWith(name))).toBe(false);
      }
      // The text may mention BEGIN:VEVENT inside a value, but no line of its own starts one.
      const own = lines(unfold(ics));
      expect(own.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
      expect(own.filter((l) => l === "END:VEVENT")).toHaveLength(1);
    }
  });

  it("cannot inject through the record id used in the UID", () => {
    const event = { ...(publish(record("a")) as PublicEvent), id: "a\r\nURL:x" };
    const ics = buildEventCalendar(event, NOW);
    expect(lines(unfold(ics)).some((l) => l.startsWith("URL"))).toBe(false);
  });
});

describe("serialization", () => {
  it("uses CRLF only: no bare CR or LF", () => {
    const ics = build("a", { description: "One\nTwo\r\nThree", title: "A\u2028B" });
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("keeps every physical line within 75 octets", () => {
    const long = "word, ".repeat(80);
    const ics = build("a", { title: long, venue: long, description: long });
    for (const row of lines(ics)) {
      expect(new TextEncoder().encode(row).length).toBeLessThanOrEqual(75);
    }
  });

  it("folds a long line, and unfolding restores it exactly", () => {
    const description = "x".repeat(300);
    const ics = build("a", { description });
    expect(ics).toContain("\r\n ");
    expect(unfold(ics)).toContain(`DESCRIPTION:${description}\r\n`);
  });

  it("folds exactly at 75 octets: the first line and then 74 plus a leading space", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`).split("\r\n");
    expect(folded[0]).toHaveLength(75);
    expect(folded[1].startsWith(" ")).toBe(true);
    expect(folded[1]).toHaveLength(75);
  });

  it("does not fold a line of exactly 75 octets, and folds one of 76", () => {
    expect(foldLine("a".repeat(75))).toBe("a".repeat(75));
    expect(foldLine("a".repeat(76)).split("\r\n")).toHaveLength(2);
  });

  it("never splits a multi-byte character", () => {
    for (const unit of ["é", "数", "🎓", "हॉ"]) {
      for (let pad = 0; pad < 6; pad++) {
        const text = `SUMMARY:${"a".repeat(pad)}${unit.repeat(60)}`;
        const folded = foldLine(text);
        const decoder = new TextDecoder("utf-8", { fatal: true });
        for (const row of folded.split("\r\n")) {
          expect(() => decoder.decode(new TextEncoder().encode(row))).not.toThrow();
          expect(new TextEncoder().encode(row).length).toBeLessThanOrEqual(75);
        }
        expect(folded.replace(/\r\n /g, "")).toBe(text);
      }
    }
  });

  it("never splits an escape sequence across lines", () => {
    for (let pad = 0; pad < 8; pad++) {
      const text = `DESCRIPTION:${"a".repeat(55 + pad)}${"\\,".repeat(30)}`;
      const rows = foldLine(text).split("\r\n");
      for (const row of rows) expect(row.replace(/^ /, "")).not.toMatch(/\\$/);
      expect(rows.join("").replace(/\r\n/g, "").replace(/ /g, "")).toBe(text.replace(/ /g, ""));
    }
  });
});

describe("only published events get a calendar file", () => {
  const records = [
    record("ok-upcoming"),
    record("ok-past", { start: new Date("2030-01-01T10:00:00Z") }),
    record("draft", {}, "draft"),
    record("bad-zone", { timezone: "Not/AZone" }),
    record("no-zone", { timezone: NEEDED }),
    record("end-before-start", { end: new Date("2030-06-30T10:00:00Z") }),
    record("no-title", { title: NEEDED }),
    record("no-venue", { venue: "  " }),
    record("no-type", { type: NEEDED }),
    record("bad-start", { start: "not a date" }),
  ];
  const content = selectEventsContent({ events: records, posts: [] }, NOW);

  it("generates a route for every public event, upcoming or past, and nothing else", () => {
    const routes = calendarRoutes(content.all, NOW).map((r) => r.params.slug);
    expect(routes).toEqual(["ok-past", "ok-upcoming"]);
  });

  it("has exactly the same route set as the event pages", () => {
    const pages = content.all.map((e) => e.id);
    const calendars = calendarRoutes(content.all, NOW).map((r) => r.params.slug);
    expect(calendars).toEqual(pages);
  });

  it("produces no route for a draft, an invalid, a malformed or an unpublished event", () => {
    const slugs = calendarRoutes(content.all, NOW).map((r) => r.params.slug);
    for (const id of [
      "draft",
      "bad-zone",
      "no-zone",
      "end-before-start",
      "no-title",
      "no-venue",
      "no-type",
      "bad-start",
    ]) {
      expect(slugs).not.toContain(id);
    }
  });

  it("passes each route its event and one shared timestamp", () => {
    const routes = calendarRoutes(content.all, NOW);
    for (const route of routes) {
      expect(route.props.event.id).toBe(route.params.slug);
      expect(route.props.now).toBe(NOW);
    }
  });

  it("produces nothing for an empty public-event set", () => {
    const none = selectEventsContent({ events: [], posts: [] }, NOW);
    expect(calendarRoutes(none.all, NOW)).toEqual([]);
    expect(none.upcoming.filter((e) => offersCalendar(e, NOW))).toEqual([]);
  });
});

describe("paths", () => {
  it("builds the calendar path from the record id, next to the page path", () => {
    expect(calendarPath("a")).toBe("/events/a.ics");
    expect(eventPath("a")).toBe("/events/a");
  });

  it("matches the route that is generated for each event", () => {
    const content = selectEventsContent({ events: [record("one"), record("two")], posts: [] }, NOW);
    const generated = calendarRoutes(content.all, NOW).map((r) => `/events/${r.params.slug}.ics`);
    expect(content.all.map((e) => calendarPath(e.id))).toEqual(generated);
  });

  it("handles unusual record ids the same way as the page route", () => {
    const ids = ["2030-07-01-workshop", "workshop_1", "a.b", "ünï", "UPPER", "a b", "a%20b"];
    const content = selectEventsContent({ events: ids.map((id) => record(id)), posts: [] }, NOW);
    for (const event of content.all) {
      // Both routes are built from the same id, so they can only differ by their ending.
      expect(calendarPath(event.id)).toBe(`${eventPath(event.id)}.ics`);
    }
    expect(calendarRoutes(content.all, NOW).map((r) => r.params.slug)).toEqual(
      content.all.map((e) => e.id),
    );
    // The id is escaped as TEXT in the UID, so odd characters cannot break the file.
    const event = content.all.find((e) => e.id === "a b") as PublicEvent;
    expect(buildEventCalendar(event, NOW)).toContain("UID:obscura-event-a b\r\n");
  });
});

describe("the Add to calendar link", () => {
  it("is offered for an upcoming event and for one in progress", () => {
    const upcoming = publish(record("a")) as PublicEvent;
    const running = publish(
      record("b", {
        start: new Date("2030-06-15T09:00:00Z"),
        end: new Date("2030-06-15T18:00:00Z"),
      }),
    ) as PublicEvent;
    expect(offersCalendar(upcoming, NOW)).toBe(true);
    expect(offersCalendar(running, NOW)).toBe(true);
  });

  it("is not offered for a past event, which still has its calendar file", () => {
    const past = publish(record("p", { start: new Date("2030-01-01T10:00:00Z") })) as PublicEvent;
    expect(offersCalendar(past, NOW)).toBe(false);
    expect(calendarRoutes([past], NOW)).toHaveLength(1);
  });

  it("is offered only for the events the page classifies as upcoming", () => {
    const content = selectEventsContent(
      {
        events: [
          record("up"),
          record("past", { start: new Date("2030-01-01T10:00:00Z") }),
          record("done", {
            start: new Date("2030-06-01T10:00:00Z"),
            end: new Date("2030-06-01T12:00:00Z"),
          }),
        ],
        posts: [],
      },
      NOW,
    );
    expect(content.all.filter((e) => offersCalendar(e, NOW)).map((e) => e.id)).toEqual(
      content.upcoming.map((e) => e.id),
    );
    expect(content.past.every((e) => !offersCalendar(e, NOW))).toBe(true);
  });
});
