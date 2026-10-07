import { describe, expect, it } from "vitest";
import { isLegacyEmpty, selectLegacy, type LegacySource } from "../../src/lib/legacyContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const term = (id: string, year: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test term ${id}`, academicYear: year, milestones: [], ...extra });
const team = (id: string, order: number, name = `Test team ${id}`, status = "verified") =>
  rec(id, { status, name, order });
const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });
const member = (
  id: string,
  p: string,
  t: string,
  tm: string,
  extra: Record<string, unknown> = {},
  status = "verified",
) =>
  rec(id, {
    status,
    person: p,
    term: t,
    team: tm,
    role: `Test role ${id}`,
    contributions: [],
    ...extra,
  });

const empty: LegacySource = { terms: [], teams: [], people: [], memberships: [] };

/** One verified term with one verified member, which tests then vary. */
const one = (overrides: Partial<LegacySource> = {}): LegacySource => ({
  terms: [term("t1", "2020-21")],
  teams: [team("core", 1)],
  people: [person("p1")],
  memberships: [member("m1", "p1", "t1", "core")],
  ...overrides,
});

describe("zero verified content", () => {
  it("returns nothing, so the timeline and Milestones are hidden", () => {
    const content = selectLegacy(empty);
    expect(content).toEqual({ terms: [], milestones: [] });
    expect(isLegacyEmpty(content)).toBe(true);
    expect(JSON.stringify(content)).toBe('{"terms":[],"milestones":[]}');
  });

  it("returns nothing when everything is a draft", () => {
    const drafts: LegacySource = {
      terms: [term("t1", "2020-21", { milestones: ["Test milestone"] }, "draft")],
      teams: [team("core", 1, "Test team", "draft")],
      people: [person("p1", {}, "draft")],
      memberships: [member("m1", "p1", "t1", "core", {}, "draft")],
    };
    expect(isLegacyEmpty(selectLegacy(drafts))).toBe(true);
  });

  it("never lets a [[NEEDED]] marker through, even on a record marked verified", () => {
    const marked: LegacySource = {
      terms: [
        term("t1", NEEDED, { milestones: [NEEDED] }),
        term("t2", "2021-22", { name: NEEDED }),
      ],
      teams: [team("core", 1, NEEDED)],
      people: [person("p1", { name: NEEDED })],
      memberships: [member("m1", "p1", "t1", "core", { role: NEEDED })],
    };
    expect(isLegacyEmpty(selectLegacy(marked))).toBe(true);
  });
});

describe("one term", () => {
  it("shows the term with its team and member", () => {
    const { terms } = selectLegacy(one());
    expect(terms).toHaveLength(1);
    expect(terms[0]).toMatchObject({ id: "t1", name: "Test term t1", academicYear: "2020-21" });
    expect(terms[0].teams[0].members[0]).toMatchObject({ id: "p1", role: "Test role m1" });
  });

  it("shows a term that has no members yet", () => {
    const { terms } = selectLegacy({ ...empty, terms: [term("t1", "2020-21")] });
    expect(terms[0].teams).toEqual([]);
  });

  it("includes the summary only when verified and present", () => {
    expect(selectLegacy(one()).terms[0].summary).toBeUndefined();
    const withSummary = one({ terms: [term("t1", "2020-21", { summary: "Test summary" })] });
    expect(selectLegacy(withSummary).terms[0].summary).toBe("Test summary");
  });
});

describe("multiple terms", () => {
  it("orders terms newest first, with id as the tie-breaker", () => {
    const source: LegacySource = {
      ...empty,
      terms: [
        term("old", "2019-20"),
        term("b", "2022-23"),
        term("a", "2022-23"),
        term("mid", "2021-22"),
        term("draft", "2030-31", {}, "draft"),
      ],
    };
    expect(selectLegacy(source).terms.map((t) => t.id)).toEqual(["a", "b", "mid", "old"]);
  });

  it("is deterministic regardless of input order", () => {
    const terms = [term("a", "2020-21"), term("b", "2021-22"), term("c", "2019-20")];
    const forward = selectLegacy({ ...empty, terms });
    const reversed = selectLegacy({ ...empty, terms: [...terms].reverse() });
    expect(reversed).toEqual(forward);
  });

  it("links a person's entries across the terms they served", () => {
    const source: LegacySource = {
      terms: [term("t1", "2020-21"), term("t2", "2021-22"), term("t3", "2022-23")],
      teams: [team("core", 1)],
      people: [person("p1")],
      memberships: [
        member("m1", "p1", "t1", "core"),
        member("m2", "p1", "t2", "core"),
        member("m3", "p1", "t3", "core"),
      ],
    };
    const { terms } = selectLegacy(source);
    const inLatest = terms[0].teams[0].members[0];
    expect(inLatest.alsoServed.map((t) => t.id)).toEqual(["t2", "t1"]);
    const inOldest = terms[2].teams[0].members[0];
    expect(inOldest.alsoServed.map((t) => t.id)).toEqual(["t3", "t2"]);
  });

  it("does not link to a term that is not verified", () => {
    const source = one({
      terms: [term("t1", "2020-21"), term("t2", "2021-22", {}, "draft")],
      memberships: [member("m1", "p1", "t1", "core"), member("m2", "p1", "t2", "core")],
    });
    expect(selectLegacy(source).terms[0].teams[0].members[0].alsoServed).toEqual([]);
  });
});

describe("multiple people in a term", () => {
  const source: LegacySource = {
    terms: [term("t1", "2020-21")],
    teams: [team("tech", 2, "Test tech"), team("core", 1, "Test core"), team("empty", 3)],
    people: [person("b"), person("a"), person("c")],
    memberships: [
      member("m1", "b", "t1", "core"),
      member("m2", "a", "t1", "core"),
      member("m3", "c", "t1", "tech"),
    ],
  };

  it("groups by team in the club's order and omits teams with no members", () => {
    expect(selectLegacy(source).terms[0].teams.map((t) => t.id)).toEqual(["core", "tech"]);
  });

  it("orders members by name within a team", () => {
    const core = selectLegacy(source).terms[0].teams[0];
    expect(core.members.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("privacy and consent", () => {
  it("excludes a person without recorded consent, or who is not verified", () => {
    const source = one({
      people: [person("p1", { consent: "not-recorded" })],
    });
    expect(selectLegacy(source).terms[0].teams).toEqual([]);
    const draftPerson = one({ people: [person("p1", {}, "draft")] });
    expect(selectLegacy(draftPerson).terms[0].teams).toEqual([]);
  });

  it("excludes a membership that is unverified, has no role, or points at an unknown record", () => {
    const base = one();
    for (const bad of [
      member("m1", "p1", "t1", "core", {}, "draft"),
      member("m1", "p1", "t1", "core", { role: NEEDED }),
      member("m1", "p1", "t1", "missing-team"),
      member("m1", "missing-person", "t1", "core"),
      member("m1", "p1", "missing-term", "core"),
    ]) {
      expect(selectLegacy({ ...base, memberships: [bad] }).terms[0].teams).toEqual([]);
    }
  });

  it("excludes a team that is not verified", () => {
    const source = one({ teams: [team("core", 1, "Test team", "draft")] });
    expect(selectLegacy(source).terms[0].teams).toEqual([]);
  });
});

describe("optional profile details", () => {
  const first = (source: LegacySource) => selectLegacy(source).terms[0].teams[0].members[0];

  it("omits photo, LinkedIn and contributions when absent", () => {
    expect(first(one())).toMatchObject({ contributions: [], alsoServed: [] });
    expect(first(one())).not.toHaveProperty("photo", expect.anything());
    expect(first(one()).photo).toBeUndefined();
    expect(first(one()).linkedin).toBeUndefined();
  });

  it("includes a photo path or https URL when present", () => {
    for (const photo of ["/people/test.jpg", "https://example.com/test.jpg"]) {
      expect(first(one({ people: [person("p1", { photo })] })).photo).toBe(photo);
    }
  });

  it("omits an unsafe or malformed photo", () => {
    for (const photo of [
      NEEDED,
      "",
      "javascript:alert(1)",
      "http://example.com/a.jpg",
      "//example.com/a.jpg",
      "data:image/png;base64,AAAA",
      "relative/path.jpg",
    ]) {
      expect(first(one({ people: [person("p1", { photo })] })).photo).toBeUndefined();
    }
  });

  it("includes a LinkedIn link only on linkedin.com over https", () => {
    const ok = "https://www.linkedin.com/in/test-person";
    expect(first(one({ people: [person("p1", { linkedin: ok })] })).linkedin).toBe(ok);
    for (const linkedin of [
      NEEDED,
      "https://example.com/in/test",
      "http://www.linkedin.com/in/test",
      "https://linkedin.com.evil.example/in/test",
      "javascript:alert(1)",
    ]) {
      expect(first(one({ people: [person("p1", { linkedin })] })).linkedin).toBeUndefined();
    }
  });

  it("keeps only real contribution notes", () => {
    const source = one({
      memberships: [
        member("m1", "p1", "t1", "core", { contributions: ["Test note", NEEDED, "  "] }),
      ],
    });
    expect(first(source).contributions).toEqual(["Test note"]);
  });

  it("does not expose the person's bio", () => {
    const source = one({ people: [person("p1", { bio: "Test bio" })] });
    expect(JSON.stringify(first(source))).not.toContain("Test bio");
  });
});

describe("founding term", () => {
  it("flags only a term a verified record marks as founding", () => {
    const source: LegacySource = {
      ...empty,
      terms: [term("t1", "2020-21", { isFoundingTerm: true }), term("t2", "2021-22")],
    };
    const flags = selectLegacy(source).terms.map((t) => [t.id, t.isFounding]);
    expect(flags).toEqual([
      ["t2", false],
      ["t1", true],
    ]);
  });

  it("flags no term when none is marked", () => {
    expect(selectLegacy(one()).terms[0].isFounding).toBe(false);
  });

  it("does not flag a draft founding term, which is not shown at all", () => {
    const source: LegacySource = {
      ...empty,
      terms: [term("t1", "2020-21", { isFoundingTerm: true }, "draft")],
    };
    expect(selectLegacy(source).terms).toEqual([]);
  });
});

describe("milestones", () => {
  it("groups verified milestones by term, newest first, and drops empty or marker entries", () => {
    const source: LegacySource = {
      ...empty,
      terms: [
        term("t1", "2020-21", { milestones: ["Test A", NEEDED] }),
        term("t2", "2021-22", { milestones: ["Test B", "Test C"] }),
        term("t3", "2022-23", { milestones: [] }),
        term("t4", "2023-24", { milestones: ["Test D"] }, "draft"),
      ],
    };
    const { milestones } = selectLegacy(source);
    expect(milestones.map((g) => [g.id, g.items])).toEqual([
      ["t2", ["Test B", "Test C"]],
      ["t1", ["Test A"]],
    ]);
  });

  it("is empty when no term has a verified milestone, so the section is hidden", () => {
    expect(selectLegacy(one()).milestones).toEqual([]);
  });
});
