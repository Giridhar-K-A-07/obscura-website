import { describe, expect, it } from "vitest";
import {
  HOME_PROJECT_LIMIT,
  TRACKS,
  formatEventDate,
  selectHomeContent,
  selectIntro,
  selectLatestPost,
  selectLearning,
  selectLegacy,
  selectNextEvent,
  selectProjects,
  selectRecent,
  type HomeSource,
} from "../../src/lib/homeContent";

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

const post = (id: string, status: string, date: string, extra: Record<string, unknown> = {}) =>
  rec(id, { status, title: `Test post ${id}`, date: day(date), authors: [], tags: [], ...extra });

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
    expect(selectProjects([project("d", "draft", "Test project")])).toEqual([]);
  });

  it("selects verified projects in a stable order, up to the homepage limit", () => {
    const projects = ["D", "B", "A", "C", "E"].map((name) =>
      project(name.toLowerCase(), "verified", `Test project ${name}`),
    );
    const selected = selectProjects(projects);
    expect(selected).toHaveLength(HOME_PROJECT_LIMIT);
    expect(selected.map((p) => p.name)).toEqual([
      "Test project A",
      "Test project B",
      "Test project C",
    ]);
  });

  it("keeps only the fields the homepage needs and omits a missing live demo", () => {
    const [selected] = selectProjects([project("p", "verified", "Test project")]);
    expect(selected.liveDemo).toBeUndefined();
    expect(Object.keys(selected).sort()).toEqual(
      ["contributors", "description", "id", "liveDemo", "name", "repository", "topics"].sort(),
    );
  });
});

describe("learning", () => {
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

  it("lists only tracks that have a verified roadmap", () => {
    const resources = [
      resource("a", "verified", {
        kind: "roadmap",
        track: "python",
        link: "https://example.com/p",
      }),
      resource("b", "draft", { kind: "roadmap", track: "sql" }),
      resource("c", "verified", { kind: "cheat-sheet" }),
    ];
    const learning = selectLearning(resources);
    expect(learning?.tracks.map((t) => t.id)).toEqual(["python"]);
    expect(learning?.tracks[0].roadmap.link).toBe("https://example.com/p");
  });

  it("is null when only non-roadmap resources are verified", () => {
    const resources = [
      resource("a", "verified", { kind: "cheat-sheet" }),
      resource("b", "verified", { kind: "code-template" }),
      resource("c", "verified", { kind: "dataset" }),
    ];
    expect(selectLearning(resources)).toBeNull();
  });

  it("is null when the only roadmaps are drafts", () => {
    const resources = [
      resource("a", "draft", { kind: "roadmap", track: "sql" }),
      resource("b", "verified", { kind: "cheat-sheet" }),
    ];
    expect(selectLearning(resources)).toBeNull();
  });

  it("renders with only that track when one verified roadmap exists", () => {
    const resources = [
      resource("a", "verified", { kind: "roadmap", track: "sql" }),
      resource("b", "verified", { kind: "dataset" }),
    ];
    const learning = selectLearning(resources);
    expect(learning?.tracks.map((t) => t.label)).toEqual(["SQL"]);
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
