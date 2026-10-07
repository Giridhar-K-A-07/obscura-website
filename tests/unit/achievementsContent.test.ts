import { describe, expect, it } from "vitest";
import {
  SPOTLIGHT_CATEGORIES,
  formatDay,
  publishablePeople,
  selectAchievementsContent,
  selectSpotlights,
  selectWinners,
  type AchievementsSource,
} from "../../src/lib/achievementsContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const achievement = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, {
    status,
    title: `Test achievement ${id}`,
    competition: `Test competition ${id}`,
    date: new Date("2030-03-01"),
    result: `Test result ${id}`,
    people: [],
    ...extra,
  });

const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });

const project = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, {
    status,
    name: `Test project ${id}`,
    description: "Test",
    repository: "https://example.com/r",
    ...extra,
  });

const spotlight = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, {
    status,
    person: "p1",
    category: "research",
    title: `Test spotlight ${id}`,
    date: new Date("2030-03-01"),
    consent: "recorded",
    ...extra,
  });

const empty: AchievementsSource = { achievements: [], spotlights: [], people: [], projects: [] };
const withPeople = (extra: Partial<AchievementsSource>): AchievementsSource => ({
  ...empty,
  people: [person("p1")],
  ...extra,
});

describe("zero verified content", () => {
  it("returns nothing, so both sections are hidden", () => {
    expect(selectAchievementsContent(empty)).toEqual({ winners: [], spotlights: [] });
    expect(JSON.stringify(selectAchievementsContent(empty))).toBe('{"winners":[],"spotlights":[]}');
  });

  it("returns nothing when everything is a draft", () => {
    const drafts = withPeople({
      achievements: [achievement("a", {}, "draft")],
      spotlights: [spotlight("s", {}, "draft")],
    });
    expect(selectAchievementsContent(drafts)).toEqual({ winners: [], spotlights: [] });
  });

  it("renders only the section that has content", () => {
    const onlyWinners = selectAchievementsContent({ ...empty, achievements: [achievement("a")] });
    expect(onlyWinners.winners).toHaveLength(1);
    expect(onlyWinners.spotlights).toEqual([]);
    const onlySpotlights = selectAchievementsContent(withPeople({ spotlights: [spotlight("s")] }));
    expect(onlySpotlights.winners).toEqual([]);
    expect(onlySpotlights.spotlights).toHaveLength(1);
  });
});

describe("competition winners", () => {
  it("selects a verified achievement with only the fields the page shows", () => {
    const [win] = selectWinners({ ...empty, achievements: [achievement("a")] });
    expect(win).toMatchObject({
      id: "a",
      title: "Test achievement a",
      competition: "Test competition a",
      result: "Test result a",
      people: [],
    });
    expect(Object.keys(win).sort()).toEqual(
      ["competition", "date", "evidenceLink", "id", "people", "project", "result", "title"].sort(),
    );
  });

  it("never publishes a [[NEEDED]] value, even on a record marked verified", () => {
    for (const field of ["title", "competition", "result", "date"]) {
      const source = { ...empty, achievements: [achievement("a", { [field]: NEEDED })] };
      expect(selectWinners(source)).toEqual([]);
    }
  });

  it("does not publish an invalid date", () => {
    expect(
      selectWinners({ ...empty, achievements: [achievement("a", { date: new Date("x") })] }),
    ).toEqual([]);
  });

  it("omits a missing optional project and evidence link", () => {
    const [win] = selectWinners({ ...empty, achievements: [achievement("a")] });
    expect(win.project).toBeUndefined();
    expect(win.evidenceLink).toBeUndefined();
  });

  it("includes a verified project, and omits an unverified, missing or marker one", () => {
    const withProject = (projects: never[], ref: string) =>
      selectWinners({ ...empty, achievements: [achievement("a", { project: ref })], projects })[0];
    expect(withProject([project("pr")], "pr").project).toEqual({
      id: "pr",
      name: "Test project pr",
    });
    expect(withProject([project("pr", {}, "draft")], "pr").project).toBeUndefined();
    expect(withProject([project("other")], "pr").project).toBeUndefined();
    expect(withProject([project("pr")], NEEDED).project).toBeUndefined();
    expect(withProject([project("pr", { name: NEEDED })], "pr").project).toBeUndefined();
  });

  it("keeps an evidence link only when it is an https URL", () => {
    const link = (evidenceLink: string) =>
      selectWinners({ ...empty, achievements: [achievement("a", { evidenceLink })] })[0]
        .evidenceLink;
    expect(link("https://example.com/proof")).toBe("https://example.com/proof");
    for (const bad of [NEEDED, "", "http://example.com", "javascript:alert(1)", "/relative"]) {
      expect(link(bad)).toBeUndefined();
    }
  });

  it("orders newest first, with id as the tie-breaker, regardless of input order", () => {
    const achievements = [
      achievement("old", { date: new Date("2029-01-01") }),
      achievement("b", { date: new Date("2031-01-01") }),
      achievement("a", { date: new Date("2031-01-01") }),
      achievement("mid", { date: new Date("2030-01-01") }),
    ];
    const forward = selectWinners({ ...empty, achievements }).map((w) => w.id);
    expect(forward).toEqual(["a", "b", "mid", "old"]);
    const reversed = selectWinners({ ...empty, achievements: [...achievements].reverse() }).map(
      (w) => w.id,
    );
    expect(reversed).toEqual(forward);
  });

  it("produces no ranking, position, score or leaderboard data", () => {
    const [win] = selectWinners({ ...empty, achievements: [achievement("a")] });
    const text = JSON.stringify(win).toLowerCase();
    for (const word of ["rank", "position", "score", "points", "leaderboard", "total"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("people on an achievement (consent)", () => {
  const people = (ids: string[], list: never[]) =>
    selectWinners({ ...empty, achievements: [achievement("a", { people: ids })], people: list })[0]
      .people;

  it("publishes a name only for a verified person with consent recorded, alphabetically", () => {
    expect(people(["b", "a"], [person("a"), person("b")])).toEqual([
      "Test Person a",
      "Test Person b",
    ]);
  });

  it("drops a person without recorded consent, a draft person, and an unresolved id", () => {
    const list = [
      person("a", { consent: "not-recorded" }),
      person("b", {}, "draft"),
      person("c", { name: NEEDED }),
    ];
    expect(people(["a", "b", "c", "missing"], list)).toEqual([]);
  });

  it("never publishes a plain name written in place of an id", () => {
    expect(people(["Some Written Name"], [person("a")])).toEqual([]);
  });

  it("lists a person once even if referenced twice", () => {
    expect(people(["a", "a"], [person("a")])).toEqual(["Test Person a"]);
  });

  it("still publishes the achievement when none of its people can be named", () => {
    const source = {
      ...empty,
      achievements: [achievement("a", { people: ["a"] })],
      people: [person("a", { consent: "not-recorded" })],
    };
    expect(selectWinners(source)).toHaveLength(1);
  });

  it("exposes only the name: no photo, LinkedIn or bio", () => {
    const rich = person("a", {
      photo: "/p.jpg",
      linkedin: "https://linkedin.com/in/x",
      bio: "Test bio",
    });
    const win = selectWinners({
      ...empty,
      achievements: [achievement("a", { people: ["a"] })],
      people: [rich],
    })[0];
    const text = JSON.stringify(win);
    for (const leaked of ["p.jpg", "linkedin", "Test bio"]) expect(text).not.toContain(leaked);
  });

  it("lists publishable people by id", () => {
    const names = publishablePeople([
      person("a"),
      person("b", {}, "draft"),
      person("c", { consent: "not-recorded" }),
    ]);
    expect([...names]).toEqual([["a", "Test Person a"]]);
  });
});

describe("member spotlights", () => {
  it("selects a verified spotlight with the person's name from their own record", () => {
    const groups = selectSpotlights(withPeople({ spotlights: [spotlight("s")] }));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ category: "research", label: "Research" });
    expect(groups[0].items[0]).toMatchObject({
      id: "s",
      title: "Test spotlight s",
      person: "Test Person p1",
    });
  });

  it("excludes an unverified spotlight", () => {
    expect(selectSpotlights(withPeople({ spotlights: [spotlight("s", {}, "draft")] }))).toEqual([]);
  });

  it("excludes a spotlight whose own consent is not recorded", () => {
    const source = withPeople({ spotlights: [spotlight("s", { consent: "not-recorded" })] });
    expect(selectSpotlights(source)).toEqual([]);
  });

  it("excludes a spotlight whose person has no recorded consent, is a draft, or does not exist", () => {
    const spotlights = [spotlight("s")];
    const cases: never[][] = [
      [person("p1", { consent: "not-recorded" })],
      [person("p1", {}, "draft")],
      [person("other")],
      [],
    ];
    for (const people of cases) {
      expect(selectSpotlights({ ...empty, spotlights, people })).toEqual([]);
    }
  });

  it("never publishes a plain name written as the person", () => {
    const source = withPeople({ spotlights: [spotlight("s", { person: "Some Written Name" })] });
    expect(selectSpotlights(source)).toEqual([]);
  });

  it("never publishes a [[NEEDED]] value, even on a record marked verified", () => {
    for (const field of ["title", "date", "person", "category"]) {
      const source = withPeople({ spotlights: [spotlight("s", { [field]: NEEDED })] });
      expect(selectSpotlights(source)).toEqual([]);
    }
  });

  it("omits a missing optional link and keeps only https links", () => {
    const link = (value?: string) =>
      selectSpotlights(
        withPeople({ spotlights: [spotlight("s", value === undefined ? {} : { link: value })] }),
      )[0].items[0].link;
    expect(link()).toBeUndefined();
    expect(link("https://example.com/x")).toBe("https://example.com/x");
    for (const bad of [NEEDED, "http://example.com", "javascript:alert(1)"]) {
      expect(link(bad)).toBeUndefined();
    }
  });

  it("supports only the schema's categories, grouped in schema order, omitting empty groups", () => {
    expect(SPOTLIGHT_CATEGORIES.map((c) => c.id)).toEqual([
      "research",
      "certification",
      "internship",
    ]);
    const source = withPeople({
      spotlights: [
        spotlight("i", { category: "internship" }),
        spotlight("r", { category: "research" }),
        spotlight("x", { category: "invented" }),
      ],
    });
    expect(selectSpotlights(source).map((g) => g.category)).toEqual(["research", "internship"]);
  });

  it("orders each group newest first, ties by id, regardless of input order", () => {
    const spotlights = [
      spotlight("old", { date: new Date("2029-01-01") }),
      spotlight("b", { date: new Date("2031-01-01") }),
      spotlight("a", { date: new Date("2031-01-01") }),
    ];
    const forward = selectSpotlights(withPeople({ spotlights }))[0].items.map((s) => s.id);
    expect(forward).toEqual(["a", "b", "old"]);
    const reversed = selectSpotlights(
      withPeople({ spotlights: [...spotlights].reverse() }),
    )[0].items.map((s) => s.id);
    expect(reversed).toEqual(forward);
  });

  it("exposes only the name: no photo, LinkedIn or bio", () => {
    const rich = person("p1", {
      photo: "/p.jpg",
      linkedin: "https://linkedin.com/in/x",
      bio: "Test bio",
    });
    const groups = selectSpotlights({ ...empty, people: [rich], spotlights: [spotlight("s")] });
    const text = JSON.stringify(groups);
    for (const leaked of ["p.jpg", "linkedin", "Test bio"]) expect(text).not.toContain(leaked);
  });
});

describe("formatDay", () => {
  it("writes a date-only value as the same calendar day, whatever the machine timezone", () => {
    expect(formatDay(new Date("2030-03-01"))).toBe("1 March 2030");
  });
});
