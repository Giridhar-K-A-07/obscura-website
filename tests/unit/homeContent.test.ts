import { describe, expect, it } from "vitest";
import {
  HOME_PROJECT_LIMIT,
  TRACKS,
  formatEventDate,
  selectHomeContent,
  selectIntro,
  selectLatestPost,
  selectLatestPastEvent,
  selectLearning,
  selectLegacy,
  selectNextEvent,
  selectProjects,
  selectRecent,
  type HomeSource,
} from "../../src/lib/homeContent";
import { eventPath, selectEventsContent } from "../../src/lib/eventsContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  Names are obviously fake; the helpers must work from whatever the records say.
*/
const NOW = new Date("2030-06-15T12:00:00Z");
const day = (iso: string) => new Date(iso);
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const event = (id: string, status: string, start: string, extra: Record<string, unknown> = {}) =>
  rec(id, {
    status,
    title: `Test event ${id}`,
    type: "Test type",
    start: day(start),
    timezone: "Asia/Kolkata",
    venue: "Test venue",
    speakers: [],
    photos: [],
    slides: [],
    repositories: [],
    ...extra,
  });

const post = (
  id: string,
  status: string,
  date: string,
  extra: Record<string, unknown> = {},
  body: string | undefined = "Test article body.",
) =>
  ({
    id,
    data: {
      source: "test",
      status,
      title: `Test post ${id}`,
      date: day(date),
      authors: [],
      tags: [],
      ...extra,
    },
    body,
  }) as never;

const project = (id: string, status: string, name: string, extra: Record<string, unknown> = {}) =>
  rec(id, {
    status,
    name,
    description: "Test description",
    repository: "https://example.com/repo",
    topics: [],
    contributors: [],
    datasets: [],
    ...extra,
  });

const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });

const term = (
  id: string,
  status: string,
  academicYear: string,
  extra: Record<string, unknown> = {},
) => rec(id, { status, name: `Test term ${id}`, academicYear, milestones: [], ...extra });

const resource = (id: string, status: string, extra: Record<string, unknown> = {}) =>
  rec(id, { status, kind: "cheat-sheet", title: `Test resource ${id}`, ...extra });

const empty: HomeSource = {
  site: [],
  events: [],
  posts: [],
  terms: [],
  projects: [],
  people: [],
  resources: [],
};

describe("empty state: no content hides every section", () => {
  it("returns nothing for every section when no collection has records", () => {
    expect(selectHomeContent(empty, NOW)).toEqual({
      nextEvent: null,
      intro: null,
      legacy: null,
      recent: null,
      projects: [],
      learning: null,
    });
  });

  it("still returns nothing when every record is a draft", () => {
    const drafts: HomeSource = {
      site: [rec("site", { status: "draft", description: "Test description" })],
      events: [event("e", "draft", "2030-07-01T10:00:00Z")],
      posts: [post("p", "draft", "2030-01-01")],
      terms: [term("t", "draft", "2029-30")],
      projects: [project("pr", "draft", "Test project")],
      people: [],
      resources: [resource("r", "draft")],
    };
    expect(selectHomeContent(drafts, NOW)).toEqual(selectHomeContent(empty, NOW));
  });

  it("never lets a [[NEEDED]] marker through, even on a record marked verified", () => {
    const marked: HomeSource = {
      site: [rec("site", { status: "verified", description: NEEDED })],
      events: [event("e", "verified", "2030-07-01T10:00:00Z", { venue: NEEDED })],
      posts: [post("p", "verified", "2030-01-01", { title: NEEDED })],
      terms: [term("t", "verified", "2029-30", { name: NEEDED })],
      projects: [project("pr", "verified", NEEDED)],
      people: [],
      resources: [resource("r", "verified", { title: NEEDED })],
    };
    expect(selectHomeContent(marked, NOW)).toEqual(selectHomeContent(empty, NOW));
  });
});

describe("intro", () => {
  it("uses a verified description", () => {
    const site = [rec("site", { status: "verified", description: "Test description" })];
    expect(selectIntro(site)).toEqual({ description: "Test description" });
  });

  it("excludes an unverified description", () => {
    const site = [rec("site", { status: "draft", description: "Test description" })];
    expect(selectIntro(site)).toBeNull();
  });
});

describe("next event", () => {
  it("excludes unverified events", () => {
    expect(selectNextEvent([event("a", "draft", "2030-07-01T10:00:00Z")], NOW)).toBeNull();
  });

  it("selects the soonest verified upcoming event", () => {
    const events = [
      event("late", "verified", "2030-09-01T10:00:00Z"),
      event("soon", "verified", "2030-07-01T10:00:00Z"),
      event("draft-sooner", "draft", "2030-06-20T10:00:00Z"),
      event("past", "verified", "2030-01-01T10:00:00Z"),
    ];
    expect(selectNextEvent(events, NOW)?.id).toBe("soon");
  });

  it("returns null when no verified event is upcoming", () => {
    const events = [event("past", "verified", "2030-01-01T10:00:00Z")];
    expect(selectNextEvent(events, NOW)).toBeNull();
  });

  it("treats an event that has started but not ended as still upcoming", () => {
    const running = event("running", "verified", "2030-06-15T09:00:00Z", {
      end: day("2030-06-15T18:00:00Z"),
    });
    expect(selectNextEvent([running], NOW)?.id).toBe("running");
  });

  it("breaks ties by id so the choice is stable", () => {
    const a = event("a", "verified", "2030-07-01T10:00:00Z");
    const b = event("b", "verified", "2030-07-01T10:00:00Z");
    expect(selectNextEvent([b, a], NOW)?.id).toBe("a");
  });
});

describe("recent", () => {
  it("selects the latest verified past event and the latest verified published article", () => {
    const events = [
      event("old", "verified", "2029-01-01T10:00:00Z"),
      event("new", "verified", "2030-05-01T10:00:00Z"),
      event("upcoming", "verified", "2030-07-01T10:00:00Z"),
      event("draft", "draft", "2030-06-01T10:00:00Z"),
    ];
    const posts = [
      post("older", "verified", "2030-01-01"),
      post("newer", "verified", "2030-04-01"),
      post("future", "verified", "2031-01-01"),
      post("draft", "draft", "2030-06-01"),
    ];
    const recent = selectRecent(events, posts, NOW);
    expect(recent?.event?.id).toBe("new");
    expect(recent?.post?.id).toBe("newer");
  });

  it("renders only the item that exists", () => {
    const onlyPost = selectRecent([], [post("p", "verified", "2030-01-01")], NOW);
    expect(onlyPost).toEqual({ event: null, post: expect.objectContaining({ id: "p" }) });
    const onlyEvent = selectRecent([event("e", "verified", "2029-01-01T10:00:00Z")], [], NOW);
    expect(onlyEvent).toEqual({ event: expect.objectContaining({ id: "e" }), post: null });
  });

  it("is null when there is neither", () => {
    expect(selectRecent([], [], NOW)).toBeNull();
    expect(selectLatestPost([post("d", "draft", "2030-01-01")], NOW)).toBeNull();
  });
});

describe("recent uses the shared publication rule", () => {
  const latest = (posts: never[]) => selectRecent([], posts, NOW)?.post?.id;

  it("shows a published article", () => {
    expect(latest([post("p", "verified", "2030-01-01")])).toBe("p");
  });

  it("never shows a post the blog would not publish", () => {
    const unpublished = [
      post("draft", "draft", "2030-01-01"),
      post("future", "verified", "2031-01-01"),
      post("bodiless", "verified", "2030-01-01", {}, ""),
      post("blank", "verified", "2030-01-01", {}, "   \n"),
      post("marker", "verified", "2030-01-01", {}, NEEDED),
      post("unsafe", "verified", "2030-01-01", {}, "<script>alert(1)</script>"),
      post("badlink", "verified", "2030-01-01", {}, "[x](javascript:alert(1))"),
    ];
    expect(latest(unpublished)).toBeUndefined();
    expect(selectRecent([], unpublished, NOW)).toBeNull();
  });

  it("skips an unpublished newer post and shows the newest published one", () => {
    const posts = [
      post("new-but-bodiless", "verified", "2030-05-01", {}, ""),
      post("older", "verified", "2030-01-01"),
    ];
    expect(latest(posts)).toBe("older");
  });
});

describe("legacy teaser", () => {
  it("is null without verified terms", () => {
    expect(selectLegacy([term("t", "draft", "2029-30")])).toBeNull();
  });

  it("picks the newest verified term and the founding term when it is a different one", () => {
    const terms = [
      term("first", "verified", "2020-21", { isFoundingTerm: true }),
      term("latest", "verified", "2029-30", { summary: "Test summary" }),
      term("middle", "verified", "2025-26"),
      term("draft", "draft", "2031-32"),
    ];
    const legacy = selectLegacy(terms);
    expect(legacy?.latest.id).toBe("latest");
    expect(legacy?.latest.summary).toBe("Test summary");
    expect(legacy?.founding?.id).toBe("first");
  });

  it("has no separate founding entry when the founding term is the latest", () => {
    const only = [term("only", "verified", "2025-26", { isFoundingTerm: true })];
    expect(selectLegacy(only)).toEqual({
      latest: expect.objectContaining({ id: "only" }),
      founding: null,
    });
  });
});

describe("projects", () => {
  it("excludes unverified projects", () => {
    expect(selectProjects([project("d", "draft", "Test project")], [])).toEqual([]);
  });

  it("selects verified projects in a stable order, up to the homepage limit", () => {
    const projects = ["D", "B", "A", "C", "E"].map((name) =>
      project(name.toLowerCase(), "verified", `Test project ${name}`),
    );
    const selected = selectProjects(projects, []);
    expect(selected).toHaveLength(HOME_PROJECT_LIMIT);
    expect(selected.map((p) => p.name)).toEqual([
      "Test project A",
      "Test project B",
      "Test project C",
    ]);
  });

  it("keeps only the fields the homepage needs and omits a missing live demo", () => {
    const [selected] = selectProjects([project("p", "verified", "Test project")], []);
    expect(selected.liveDemo).toBeUndefined();
    expect(Object.keys(selected).sort()).toEqual(
      ["contributors", "description", "id", "liveDemo", "name", "repository", "topics"].sort(),
    );
  });
});

describe("project contributors (consent)", () => {
  const contributorsOf = (ids: string[], people: never[]) =>
    selectProjects([project("p", "verified", "Test project", { contributors: ids })], people)[0]
      .contributors;

  it("names a contributor who is a verified person with consent recorded", () => {
    expect(contributorsOf(["a"], [person("a")])).toEqual(["Test Person a"]);
  });

  it("keeps the order written in the record", () => {
    expect(contributorsOf(["b", "a"], [person("a"), person("b")])).toEqual([
      "Test Person b",
      "Test Person a",
    ]);
  });

  it("omits a draft person", () => {
    expect(contributorsOf(["a"], [person("a", {}, "draft")])).toEqual([]);
  });

  it("omits a person without recorded consent", () => {
    expect(contributorsOf(["a"], [person("a", { consent: "not-recorded" })])).toEqual([]);
  });

  it("omits an unresolved id, and never shows the raw id", () => {
    const result = contributorsOf(["missing-id"], [person("a")]);
    expect(result).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("missing-id");
  });

  it("omits a written name instead of showing it as a fallback", () => {
    expect(contributorsOf(["Some Written Name"], [person("a")])).toEqual([]);
  });

  it("shows a duplicated id once", () => {
    expect(contributorsOf(["a", "a"], [person("a")])).toEqual(["Test Person a"]);
  });

  it("omits a person whose name is a [[NEEDED]] marker", () => {
    expect(contributorsOf(["a"], [person("a", { name: NEEDED })])).toEqual([]);
  });

  it("still returns the project when no contributor can be named, with an empty list to omit", () => {
    const [selected] = selectProjects(
      [project("p", "verified", "Test project", { contributors: ["a", "b"] })],
      [person("a", { consent: "not-recorded" })],
    );
    expect(selected).toMatchObject({ name: "Test project", contributors: [] });
  });

  it("exposes only the name: no photo, LinkedIn, bio or id", () => {
    const rich = person("a", {
      photo: "/people/secret.jpg",
      linkedin: "https://www.linkedin.com/in/secret",
      bio: "Secret bio",
    });
    const projects = selectProjects(
      [project("p", "verified", "Test project", { contributors: ["a"] })],
      [rich],
    );
    const text = JSON.stringify(projects);
    for (const leaked of ["secret.jpg", "linkedin", "Secret bio"])
      expect(text).not.toContain(leaked);
    expect(projects[0].contributors).toEqual(["Test Person a"]);
  });

  it("applies the same rule through the whole homepage selection", () => {
    const source: HomeSource = {
      ...empty,
      projects: [project("p", "verified", "Test project", { contributors: ["a", "b", "Written"] })],
      people: [person("a"), person("b", { consent: "not-recorded" })],
    };
    expect(selectHomeContent(source, NOW).projects[0].contributors).toEqual(["Test Person a"]);
  });

  it("keeps the homepage project order and limit when contributors are present", () => {
    const projects = ["D", "B", "A", "C", "E"].map((name) =>
      project(name.toLowerCase(), "verified", `Test project ${name}`, { contributors: ["a"] }),
    );
    const selected = selectProjects(projects, [person("a")]);
    expect(selected).toHaveLength(HOME_PROJECT_LIMIT);
    expect(selected.map((p) => p.name)).toEqual([
      "Test project A",
      "Test project B",
      "Test project C",
    ]);
  });
});

describe("learning", () => {
  const goodRoadmap = (id: string, track: string, extra: Record<string, unknown> = {}) =>
    resource(id, "verified", {
      kind: "roadmap",
      track,
      lastReviewed: day("2030-03-01"),
      steps: [{ title: "Test step", why: "Test reason", resources: [] }],
      ...extra,
    });

  it("is null without verified resources, so the section is hidden", () => {
    expect(selectLearning([resource("r", "draft")])).toBeNull();
    expect(selectLearning([])).toBeNull();
  });

  it("keeps the four official track names", () => {
    expect(TRACKS.map((t) => t.label)).toEqual([
      "Data Science",
      "Machine Learning",
      "Python",
      "SQL",
    ]);
  });

  it("lists only tracks that have a published roadmap, linked to the on-site page", () => {
    const resources = [
      goodRoadmap("a", "python"),
      resource("b", "draft", { kind: "roadmap", track: "sql" }),
      resource("c", "verified", { kind: "cheat-sheet" }),
    ];
    const learning = selectLearning(resources);
    expect(learning?.tracks.map((t) => t.id)).toEqual(["python"]);
    expect(learning?.tracks[0].roadmap.href).toBe("/learn/roadmaps/python");
  });

  it("is null when only non-roadmap resources are verified", () => {
    const resources = [
      resource("a", "verified", { kind: "cheat-sheet" }),
      resource("b", "verified", { kind: "code-template" }),
      resource("c", "verified", { kind: "dataset" }),
    ];
    expect(selectLearning(resources)).toBeNull();
  });

  it("is null when the only roadmaps are drafts, or are not publishable", () => {
    const resources = [
      resource("a", "draft", { kind: "roadmap", track: "sql" }),
      resource("b", "verified", { kind: "cheat-sheet" }),
      resource("c", "verified", { kind: "roadmap", track: "python", steps: [] }),
    ];
    expect(selectLearning(resources)).toBeNull();
  });

  it("renders with only that track when one published roadmap exists", () => {
    const resources = [goodRoadmap("a", "sql"), resource("b", "verified", { kind: "dataset" })];
    const learning = selectLearning(resources);
    expect(learning?.tracks.map((t) => t.label)).toEqual(["SQL"]);
  });

  it("applies the same rule through the whole homepage selection", () => {
    const source: HomeSource = { ...empty, resources: [goodRoadmap("a", "python")] };
    expect(selectHomeContent(source, NOW).learning?.tracks.map((t) => t.id)).toEqual(["python"]);
  });
});

describe("no fake fallback content", () => {
  it("produces no strings at all from empty input", () => {
    expect(JSON.stringify(selectHomeContent(empty, NOW))).toBe(
      '{"nextEvent":null,"intro":null,"legacy":null,"recent":null,"projects":[],"learning":null}',
    );
  });
});

describe("formatEventDate", () => {
  it("shows the timezone with the time", () => {
    expect(formatEventDate(day("2030-07-01T10:00:00Z"), "Asia/Kolkata")).toMatch(/15:30/);
  });

  it("falls back to UTC, and says so, for an unrecognised timezone", () => {
    const text = formatEventDate(day("2030-07-01T10:00:00Z"), "not a timezone");
    expect(text).toMatch(/10:00/);
    expect(text).toMatch(/UTC/);
  });
});

// ---- Homepage events use the canonical public event set ------------------------------------

describe("homepage events use the Events publication rule", () => {
  const publicIds = (events: never[]) =>
    selectEventsContent({ events, posts: [] }, NOW).all.map((e) => e.id);

  /** Events that must never reach the homepage: each fails the canonical rule for one reason. */
  const unpublishable = [
    event("bad-zone", "verified", "2030-07-01T10:00:00Z", { timezone: "not a timezone" }),
    event("no-zone", "verified", "2030-07-02T10:00:00Z", { timezone: NEEDED }),
    event("end-before-start", "verified", "2030-07-03T10:00:00Z", {
      end: day("2030-07-03T08:00:00Z"),
    }),
    event("no-title", "verified", "2030-07-04T10:00:00Z", { title: NEEDED }),
    event("no-venue", "verified", "2030-07-05T10:00:00Z", { venue: "  " }),
    event("no-type", "verified", "2030-07-06T10:00:00Z", { type: NEEDED }),
    event("draft", "draft", "2030-07-07T10:00:00Z"),
    event("past-bad-zone", "verified", "2029-01-01T10:00:00Z", { timezone: "Nowhere/Land" }),
    event("past-end-before-start", "verified", "2029-02-01T10:00:00Z", {
      end: day("2029-01-31T10:00:00Z"),
    }),
    event("past-draft", "draft", "2029-03-01T10:00:00Z"),
  ];

  it("never selects an event that /events does not publish, as next or as recent", () => {
    expect(publicIds(unpublishable)).toEqual([]);
    expect(selectNextEvent(unpublishable, NOW)).toBeNull();
    expect(selectRecent(unpublishable, [], NOW)).toBeNull();
    expect(selectHomeContent({ ...empty, events: unpublishable }, NOW)).toEqual(
      selectHomeContent(empty, NOW),
    );
  });

  it("skips an unpublishable event that would otherwise come first", () => {
    const events = [
      ...unpublishable,
      event("valid-later", "verified", "2030-12-01T10:00:00Z"),
      event("valid-past", "verified", "2028-01-01T10:00:00Z"),
    ];
    expect(selectNextEvent(events, NOW)?.id).toBe("valid-later");
    expect(selectLatestPastEvent(events, NOW)?.id).toBe("valid-past");
  });

  it("selects only from the set /events and /events/[slug] are generated from", () => {
    const events = [
      ...unpublishable,
      event("a", "verified", "2030-07-01T10:00:00Z"),
      event("b", "verified", "2030-09-01T10:00:00Z"),
      event("old", "verified", "2029-05-01T10:00:00Z"),
      event("older", "verified", "2028-05-01T10:00:00Z"),
    ];
    const pages = new Set(publicIds(events));
    const content = selectHomeContent({ ...empty, events }, NOW);
    expect(content.nextEvent && pages.has(content.nextEvent.id)).toBe(true);
    expect(content.recent?.event && pages.has(content.recent.event.id)).toBe(true);
    expect(content.nextEvent?.id).toBe("a");
    expect(content.recent?.event?.id).toBe("old");
  });

  it("agrees with the Events page split: next is the first upcoming, recent the first past", () => {
    const events = [
      event("u2", "verified", "2030-08-01T10:00:00Z"),
      event("u1", "verified", "2030-07-01T10:00:00Z"),
      event("p1", "verified", "2030-05-01T10:00:00Z"),
      event("p2", "verified", "2030-04-01T10:00:00Z"),
    ];
    const { upcoming, past } = selectEventsContent({ events, posts: [] }, NOW);
    expect(selectNextEvent(events, NOW)).toEqual(upcoming[0]);
    expect(selectLatestPastEvent(events, NOW)).toEqual(past[0]);
  });

  it("links to the event's own page, which is generated for it", () => {
    const events = [
      event("next-one", "verified", "2030-07-01T10:00:00Z"),
      event("last-one", "verified", "2029-07-01T10:00:00Z"),
    ];
    const routes = selectEventsContent({ events, posts: [] }, NOW).all.map((e) => eventPath(e.id));
    const content = selectHomeContent({ ...empty, events }, NOW);
    expect(routes).toContain(eventPath(content.nextEvent?.id ?? ""));
    expect(routes).toContain(eventPath(content.recent?.event?.id ?? ""));
    expect(eventPath("next-one")).toBe("/events/next-one");
  });

  it("keeps an event in progress as the next event, ordering deterministic with id ties", () => {
    const running = event("running", "verified", "2030-06-15T09:00:00Z", {
      end: day("2030-06-15T18:00:00Z"),
    });
    expect(selectNextEvent([running], NOW)?.id).toBe("running");
    const a = event("a", "verified", "2030-07-01T10:00:00Z");
    const b = event("b", "verified", "2030-07-01T10:00:00Z");
    expect(selectNextEvent([b, a], NOW)?.id).toBe("a");
    expect(selectNextEvent([a, b], NOW)?.id).toBe("a");
  });

  it("carries the event's recorded timezone, so the written time matches the Events pages", () => {
    const next = selectNextEvent([event("a", "verified", "2030-07-01T10:00:00Z")], NOW);
    expect(next?.timezone).toBe("Asia/Kolkata");
    expect(formatEventDate(next?.start ?? NOW, next?.timezone ?? "")).toMatch(/15:30/);
  });

  it("keeps the empty state: no events means no Next event and no Recent event", () => {
    expect(selectNextEvent([], NOW)).toBeNull();
    expect(selectLatestPastEvent([], NOW)).toBeNull();
    expect(selectHomeContent(empty, NOW).nextEvent).toBeNull();
    expect(selectHomeContent(empty, NOW).recent).toBeNull();
  });

  it("does not let an article change which event is selected", () => {
    const events = [event("e", "verified", "2029-01-01T10:00:00Z", { relatedPost: "p" })];
    const withPost = selectRecent(events, [post("p", "verified", "2030-01-01")], NOW);
    const without = selectRecent(events, [], NOW);
    expect(withPost?.event?.id).toBe("e");
    expect(without?.event?.id).toBe("e");
  });
});

describe("homepage events with an unsafe body", () => {
  it("never selects an event whose Markdown body fails the safety check", () => {
    const unsafe = (id: string, start: string) =>
      ({ ...(event(id, "verified", start) as object), body: "<script>x</script>" }) as never;
    const events = [
      unsafe("bad-next", "2030-07-01T10:00:00Z"),
      unsafe("bad-past", "2029-01-01T10:00:00Z"),
    ];
    expect(selectNextEvent(events, NOW)).toBeNull();
    expect(selectLatestPastEvent(events, NOW)).toBeNull();
    expect(selectHomeContent({ ...empty, events }, NOW)).toEqual(selectHomeContent(empty, NOW));
  });
});
