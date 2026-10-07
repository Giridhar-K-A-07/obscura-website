import { describe, expect, it } from "vitest";
import {
  applyFilter,
  classify,
  describeWhen,
  filterCombinations,
  filterHref,
  filterOptions,
  filterPath,
  parseFilterPath,
  selectEventsContent,
  selectPublicEvents,
  slugify,
  splitEvents,
  yearOf,
  type EventsSource,
  type PublicEvent,
} from "../../src/lib/eventsContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";
const NOW = new Date("2030-06-15T12:00:00Z");

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const entry = (id: string, data: Record<string, unknown>, body?: string): never =>
  ({ id, data: { source: "test", ...data }, body }) as never;

const event = (
  id: string,
  start: string,
  extra: Record<string, unknown> = {},
  status = "verified",
  body?: string,
) =>
  entry(
    id,
    {
      status,
      title: `Test event ${id}`,
      type: "Test type",
      start: new Date(start),
      timezone: "Asia/Kolkata",
      venue: "Test venue",
      speakers: [],
      photos: [],
      slides: [],
      repositories: [],
      ...extra,
    },
    body,
  );

const post = (id: string, status = "verified", extra: Record<string, unknown> = {}) =>
  entry(id, { status, title: `Test post ${id}`, date: new Date("2030-01-01"), ...extra });

const empty: EventsSource = { events: [], posts: [] };
const one = (e: never, posts: never[] = []): PublicEvent[] => selectPublicEvents([e], posts);
const first = (e: never, posts: never[] = []) => one(e, posts)[0];

describe("zero verified events", () => {
  it("returns nothing, so Upcoming, Past and every detail page are absent", () => {
    expect(selectEventsContent(empty, NOW)).toEqual({ all: [], upcoming: [], past: [] });
    expect(JSON.stringify(selectEventsContent(empty, NOW))).toBe(
      '{"all":[],"upcoming":[],"past":[]}',
    );
  });

  it("returns nothing when every event is a draft", () => {
    const drafts = {
      events: [
        event("a", "2030-07-01T10:00:00Z", {}, "draft"),
        event("b", "2020-01-01T10:00:00Z", {}, "draft"),
      ],
      posts: [],
    };
    expect(selectEventsContent(drafts, NOW).all).toEqual([]);
  });

  it("never publishes a [[NEEDED]] value, even on a record marked verified", () => {
    for (const field of ["title", "type", "venue", "timezone", "start"]) {
      const e = event("a", "2030-07-01T10:00:00Z", { [field]: NEEDED });
      expect(one(e)).toEqual([]);
    }
  });

  it("only verified events generate detail-page data", () => {
    const events = [
      event("ok", "2030-07-01T10:00:00Z"),
      event("draft", "2030-07-02T10:00:00Z", {}, "draft"),
    ];
    expect(selectPublicEvents(events, []).map((e) => e.id)).toEqual(["ok"]);
  });
});

describe("required values and data errors", () => {
  it("does not publish an event with an unrecognised timezone", () => {
    expect(one(event("a", "2030-07-01T10:00:00Z", { timezone: "Not/AZone" }))).toEqual([]);
  });

  it("does not publish an event whose end is before its start", () => {
    const e = event("a", "2030-07-01T10:00:00Z", { end: new Date("2030-07-01T09:00:00Z") });
    expect(one(e)).toEqual([]);
  });

  it("does not publish an event with an invalid start date", () => {
    expect(one(event("a", "not a date"))).toEqual([]);
  });

  it("treats an end that is a marker as no end", () => {
    const e = first(event("a", "2030-07-01T10:00:00Z", { end: NEEDED }));
    expect(e.end).toBeUndefined();
  });
});

describe("classification", () => {
  const ev = (start: string, end?: string) =>
    first(event("a", start, end ? { end: new Date(end) } : {}));

  it("an event with no end is past once its start has passed", () => {
    expect(classify(ev("2030-06-15T11:59:00Z"), NOW)).toBe("past");
    expect(classify(ev("2030-06-15T12:01:00Z"), NOW)).toBe("upcoming");
  });

  it("an event is upcoming at exactly its start when it has no end", () => {
    expect(classify(ev("2030-06-15T12:00:00Z"), NOW)).toBe("upcoming");
  });

  it("an event with an end stays upcoming until the end has passed", () => {
    const running = ev("2030-06-15T09:00:00Z", "2030-06-15T18:00:00Z");
    expect(classify(running, NOW)).toBe("upcoming");
    const over = ev("2030-06-15T09:00:00Z", "2030-06-15T11:00:00Z");
    expect(classify(over, NOW)).toBe("past");
  });

  it("handles an event that crosses midnight", () => {
    const overnight = ev("2030-06-14T22:00:00Z", "2030-06-15T13:00:00Z");
    expect(classify(overnight, NOW)).toBe("upcoming");
    expect(classify(overnight, new Date("2030-06-15T13:00:01Z"))).toBe("past");
  });

  it("does not depend on the recorded timezone: the same instant classifies the same", () => {
    const a = first(event("a", "2030-06-15T12:30:00Z", { timezone: "Asia/Kolkata" }));
    const b = first(event("b", "2030-06-15T12:30:00Z", { timezone: "America/Los_Angeles" }));
    expect(classify(a, NOW)).toBe(classify(b, NOW));
  });
});

describe("ordering", () => {
  const source = [
    event("p-old", "2029-01-01T10:00:00Z"),
    event("p-new", "2030-05-01T10:00:00Z"),
    event("u-late", "2030-09-01T10:00:00Z"),
    event("u-soon", "2030-07-01T10:00:00Z"),
  ];

  it("lists upcoming soonest first and past newest first", () => {
    const { upcoming, past } = splitEvents(selectPublicEvents(source, []), NOW);
    expect(upcoming.map((e) => e.id)).toEqual(["u-soon", "u-late"]);
    expect(past.map((e) => e.id)).toEqual(["p-new", "p-old"]);
  });

  it("breaks ties between events on the same instant by id, in both lists", () => {
    const tied = [
      event("b", "2030-07-01T10:00:00Z"),
      event("a", "2030-07-01T10:00:00Z"),
      event("d", "2020-07-01T10:00:00Z"),
      event("c", "2020-07-01T10:00:00Z"),
    ];
    const { upcoming, past } = splitEvents(selectPublicEvents(tied, []), NOW);
    expect(upcoming.map((e) => e.id)).toEqual(["a", "b"]);
    expect(past.map((e) => e.id)).toEqual(["c", "d"]);
  });

  it("keeps several events on the same date in time order", () => {
    const sameDay = [event("late", "2030-07-01T15:00:00Z"), event("early", "2030-07-01T09:00:00Z")];
    expect(splitEvents(selectPublicEvents(sameDay, []), NOW).upcoming.map((e) => e.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("is deterministic regardless of input order", () => {
    const forward = selectEventsContent({ events: source, posts: [] }, NOW);
    const reversed = selectEventsContent({ events: [...source].reverse(), posts: [] }, NOW);
    expect(reversed).toEqual(forward);
  });
});

describe("writing dates in the recorded timezone", () => {
  it("writes the same instant differently in different recorded timezones", () => {
    const kolkata = describeWhen(first(event("a", "2030-07-01T10:00:00Z")));
    expect(kolkata).toMatchObject({
      startDate: "1 July 2030",
      startTime: "15:30",
      timezone: "Asia/Kolkata",
      offset: "GMT+5:30",
    });
    const utc = describeWhen(first(event("b", "2030-07-01T10:00:00Z", { timezone: "UTC" })));
    expect(utc.startTime).toBe("10:00");
    expect(utc.offset).toMatch(/^GMT(\+0)?$/); // wording differs between ICU versions
  });

  it("shows no end when the record has none", () => {
    const when = describeWhen(first(event("a", "2030-07-01T10:00:00Z")));
    expect(when.endTime).toBeUndefined();
    expect(when.endDate).toBeUndefined();
  });

  it("reports whether the end is on the same day, in the event's timezone", () => {
    const sameDay = describeWhen(
      first(event("a", "2030-07-01T10:00:00Z", { end: new Date("2030-07-01T12:00:00Z") })),
    );
    expect(sameDay).toMatchObject({ endTime: "17:30", sameDay: true });
    // 22:00Z is already 03:30 the next day in Asia/Kolkata.
    const crossing = describeWhen(
      first(event("b", "2030-07-01T10:00:00Z", { end: new Date("2030-07-01T22:00:00Z") })),
    );
    expect(crossing).toMatchObject({ endDate: "2 July 2030", endTime: "03:30", sameDay: false });
  });

  it("takes the year from the event's own timezone", () => {
    // 20:00Z on 31 Dec is already 1 Jan in Kolkata, but still 31 Dec in UTC.
    const instant = "2030-12-31T20:00:00Z";
    expect(yearOf(first(event("a", instant, { timezone: "Asia/Kolkata" })))).toBe(2031);
    expect(yearOf(first(event("b", instant, { timezone: "UTC" })))).toBe(2030);
  });
});

describe("optional assets", () => {
  it("omits description, recap, photos, slides, repositories and related article when absent", () => {
    const e = first(event("a", "2030-07-01T10:00:00Z"));
    expect(e).toMatchObject({
      photos: [],
      slides: [],
      repositories: [],
      hasRecap: false,
    });
    expect(e.description).toBeUndefined();
    expect(e.relatedPost).toBeUndefined();
  });

  it("treats a Markdown body as the recap, and a marker or blank body as none", () => {
    expect(first(event("a", "2030-07-01T10:00:00Z", {}, "verified", "Test recap.")).hasRecap).toBe(
      true,
    );
    expect(first(event("a", "2030-07-01T10:00:00Z", {}, "verified", "  \n")).hasRecap).toBe(false);
    expect(first(event("a", "2030-07-01T10:00:00Z", {}, "verified", NEEDED)).hasRecap).toBe(false);
  });

  it("keeps valid photos, slides and repositories", () => {
    const e = first(
      event("a", "2030-07-01T10:00:00Z", {
        photos: ["/events/a/1.jpg", "https://example.com/2.jpg"],
        slides: ["/events/a/slides.pdf"],
        repositories: ["https://example.com/org/repo"],
        description: "Test description",
      }),
    );
    expect(e.photos).toEqual(["/events/a/1.jpg", "https://example.com/2.jpg"]);
    expect(e.slides).toEqual(["/events/a/slides.pdf"]);
    expect(e.repositories).toEqual(["https://example.com/org/repo"]);
    expect(e.description).toBe("Test description");
  });

  it("drops unsafe, malformed and marker asset values", () => {
    const bad = [
      NEEDED,
      "",
      "javascript:alert(1)",
      "http://example.com/a.jpg",
      "//example.com/a.jpg",
      "data:image/png;base64,AAAA",
      "relative/path.jpg",
    ];
    const e = first(
      event("a", "2030-07-01T10:00:00Z", {
        photos: bad,
        slides: bad,
        repositories: [...bad, "git@example.com:org/repo.git"],
      }),
    );
    expect(e.photos).toEqual([]);
    expect(e.slides).toEqual([]);
    expect(e.repositories).toEqual([]);
  });

  it("does not expose speakers", () => {
    const e = first(event("a", "2030-07-01T10:00:00Z", { speakers: ["Test Speaker"] }));
    expect(JSON.stringify(e)).not.toContain("Test Speaker");
  });
});

describe("related article", () => {
  const withRelated = event("a", "2030-07-01T10:00:00Z", { relatedPost: "p1" });

  it("links a verified article", () => {
    expect(first(withRelated, [post("p1")]).relatedPost).toEqual({
      id: "p1",
      title: "Test post p1",
    });
  });

  it("omits an unverified, missing, or untitled article", () => {
    expect(first(withRelated, [post("p1", "draft")]).relatedPost).toBeUndefined();
    expect(first(withRelated, [post("other")]).relatedPost).toBeUndefined();
    expect(first(withRelated, []).relatedPost).toBeUndefined();
    expect(
      first(withRelated, [post("p1", "verified", { title: NEEDED })]).relatedPost,
    ).toBeUndefined();
  });

  it("ignores a marker used as the reference", () => {
    const e = event("a", "2030-07-01T10:00:00Z", { relatedPost: NEEDED });
    expect(first(e, [post("p1")]).relatedPost).toBeUndefined();
  });
});

describe("filters", () => {
  const events = selectPublicEvents(
    [
      event("w-2029", "2029-03-01T10:00:00Z", { type: "Workshop" }),
      event("w-2030", "2030-03-01T10:00:00Z", { type: "Workshop" }),
      event("h-2030", "2030-04-01T10:00:00Z", { type: "Guest Lecture" }),
      event("h-2028", "2028-04-01T10:00:00Z", { type: "Hackathon" }),
    ],
    [],
  );

  it("slugifies types", () => {
    expect(slugify("Guest Lecture")).toBe("guest-lecture");
    expect(slugify("  Outreach & Orientation! ")).toBe("outreach-orientation");
    expect(slugify("Café")).toBe("cafe");
    expect(slugify("!!!")).toBe("");
  });

  it("filters by type", () => {
    expect(
      applyFilter(events, { type: "workshop" })
        .map((e) => e.id)
        .sort(),
    ).toEqual(["w-2029", "w-2030"]);
  });

  it("filters by year", () => {
    expect(
      applyFilter(events, { year: 2030 })
        .map((e) => e.id)
        .sort(),
    ).toEqual(["h-2030", "w-2030"]);
  });

  it("filters by type and year together, and by neither", () => {
    expect(applyFilter(events, { type: "workshop", year: 2030 }).map((e) => e.id)).toEqual([
      "w-2030",
    ]);
    expect(applyFilter(events, {})).toHaveLength(4);
  });

  it("offers only types and years that exist, with years newest first and types alphabetical", () => {
    expect(filterOptions(events)).toEqual({
      types: [
        { slug: "guest-lecture", label: "Guest Lecture" },
        { slug: "hackathon", label: "Hackathon" },
        { slug: "workshop", label: "Workshop" },
      ],
      years: [2030, 2029, 2028],
    });
  });

  it("narrows one dimension's options by the other selection", () => {
    expect(filterOptions(events, { type: "workshop" }).years).toEqual([2030, 2029]);
    expect(filterOptions(events, { year: 2030 }).types.map((t) => t.slug)).toEqual([
      "guest-lecture",
      "workshop",
    ]);
  });

  it("does not invent options when there are no events", () => {
    expect(filterOptions([])).toEqual({ types: [], years: [] });
    expect(filterCombinations([])).toEqual([]);
  });

  it("generates exactly the combinations that have an event, once each", () => {
    const paths = filterCombinations(events).map(filterPath);
    expect(paths).toEqual(
      [
        "type/guest-lecture",
        "type/guest-lecture/year/2030",
        "type/hackathon",
        "type/hackathon/year/2028",
        "type/workshop",
        "type/workshop/year/2029",
        "type/workshop/year/2030",
        "year/2028",
        "year/2029",
        "year/2030",
      ].sort(),
    );
    for (const filter of filterCombinations(events)) {
      expect(applyFilter(events, filter).length).toBeGreaterThan(0);
    }
  });

  it("skips a type with no URL-safe characters but keeps its year and the event itself", () => {
    const odd = selectPublicEvents([event("a", "2030-03-01T10:00:00Z", { type: "!!!" })], []);
    expect(filterCombinations(odd).map(filterPath)).toEqual(["year/2030"]);
    expect(filterOptions(odd).types).toEqual([]);
  });

  it("round-trips filter paths and rejects malformed ones", () => {
    for (const filter of [{ type: "workshop" }, { year: 2030 }, { type: "workshop", year: 2030 }]) {
      expect(parseFilterPath(filterPath(filter))).toEqual(filter);
    }
    for (const bad of [
      "",
      "type",
      "year/20x0",
      "year/2030/type/a",
      "type/A B",
      "other/x",
      "type/a/extra",
    ]) {
      expect(parseFilterPath(bad)).toBeNull();
    }
    expect(filterHref({})).toBe("/events");
    expect(filterHref({ type: "workshop", year: 2030 })).toBe(
      "/events/archive/type/workshop/year/2030",
    );
  });
});
