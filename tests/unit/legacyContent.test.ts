import { describe, expect, it } from "vitest";
import {
  isLegacyEmpty,
  legacyTermPaths,
  selectLegacy,
  selectLegacyTerm,
  termsWithPages,
  type LegacySource,
} from "../../src/lib/legacyContent";

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

// ---- Term pages ----------------------------------------------------------------------------

/** Every member, in every team of every term, as "term/team/person". */
const roster = (source: LegacySource) =>
  selectLegacy(source).terms.flatMap((t) =>
    t.teams.flatMap((tm) => tm.members.map((m) => `${t.id}/${tm.id}/${m.id}`)),
  );

describe("faculty is not part of the Executive Committee", () => {
  const withFaculty = (facultyName: string): LegacySource => ({
    terms: [term("t1", "2020-21"), term("t2", "2021-22")],
    teams: [team("core", 1), team("fac", 0, facultyName)],
    people: [person("p1"), person("prof")],
    memberships: [
      member("m1", "p1", "t1", "core"),
      member("m2", "prof", "t1", "fac"),
      member("m3", "prof", "t2", "fac"),
    ],
  });

  it("leaves a verified faculty membership out of the timeline", () => {
    expect(roster(withFaculty("Faculty"))).toEqual(["t1/core/p1"]);
  });

  it("matches the faculty team the way About does: ignoring case and surrounding spaces", () => {
    for (const name of ["faculty", "FACULTY", "  Faculty  "]) {
      expect(roster(withFaculty(name))).toEqual(["t1/core/p1"]);
    }
  });

  it("gives no team, member or page to a term that has only faculty", () => {
    const content = selectLegacy(withFaculty("Faculty"));
    const t2 = content.terms.find((t) => t.id === "t2");
    expect(t2?.teams).toEqual([]);
    expect(t2?.hasPage).toBe(false);
    expect(legacyTermPaths(content).map((p) => p.params.term)).toEqual(["t1"]);
    expect(selectLegacyTerm(content, "t2")).toBeUndefined();
    expect(JSON.stringify(content)).not.toContain("prof");
  });

  it("does not link a term served only as faculty", () => {
    const source = withFaculty("Faculty");
    source.memberships.push(member("m4", "p1", "t2", "fac"));
    const members = selectLegacy(source).terms.flatMap((t) => t.teams.flatMap((tm) => tm.members));
    expect(members).toHaveLength(1);
    expect(members[0].alsoServed).toEqual([]);
  });

  it("still shows a person who is faculty in one team and on the committee in another", () => {
    const source = withFaculty("Faculty");
    source.memberships.push(member("m4", "prof", "t1", "core"));
    expect(roster(source)).toEqual(["t1/core/p1", "t1/core/prof"]);
  });
});

describe("term pages: route generation", () => {
  it("generates a route only for a verified term with a qualifying member", () => {
    const source: LegacySource = {
      terms: [
        term("full", "2022-23"),
        term("empty", "2021-22"),
        term("draft", "2020-21", {}, "draft"),
        term("unconsented", "2019-20"),
      ],
      teams: [team("core", 1)],
      people: [person("p1"), person("p2", { consent: "not-recorded" })],
      memberships: [
        member("m1", "p1", "full", "core"),
        member("m2", "p1", "draft", "core"),
        member("m3", "p2", "unconsented", "core"),
      ],
    };
    const content = selectLegacy(source);
    expect(legacyTermPaths(content).map((p) => p.params.term)).toEqual(["full"]);
    expect(content.terms.map((t) => [t.id, t.hasPage])).toEqual([
      ["full", true],
      ["empty", false],
      ["unconsented", false],
    ]);
    for (const id of ["draft", "empty", "unconsented", "missing"]) {
      expect(selectLegacyTerm(content, id)).toBeUndefined();
    }
  });

  it("generates nothing for empty or all-draft content", () => {
    expect(legacyTermPaths(selectLegacy(empty))).toEqual([]);
    const drafts = one({
      terms: [term("t1", "2020-21", {}, "draft")],
      teams: [team("core", 1, "Test team", "draft")],
      people: [person("p1", {}, "draft")],
      memberships: [member("m1", "p1", "t1", "core", {}, "draft")],
    });
    expect(legacyTermPaths(selectLegacy(drafts))).toEqual([]);
  });

  it("uses the term record id as the route segment and passes the term as props", () => {
    const content = selectLegacy(one());
    const [path] = legacyTermPaths(content);
    expect(path.params).toEqual({ term: "t1" });
    expect(path.props.term).toMatchObject({ id: "t1", name: "Test term t1", hasPage: true });
    expect(selectLegacyTerm(content, "t1")).toBe(path.props.term);
  });

  it("treats a [[NEEDED]] person, team, term or role as missing, so no page", () => {
    for (const source of [
      one({ people: [person("p1", { name: NEEDED })] }),
      one({ teams: [team("core", 1, NEEDED)] }),
      one({ terms: [term("t1", NEEDED)] }),
      one({ memberships: [member("m1", "p1", "t1", "core", { role: NEEDED })] }),
      one({ memberships: [member("m1", NEEDED, "t1", "core")] }),
    ]) {
      expect(legacyTermPaths(selectLegacy(source))).toEqual([]);
    }
  });

  it("publishes a partly filled term with only its qualifying members", () => {
    const source: LegacySource = {
      terms: [term("t1", "2020-21")],
      teams: [team("core", 1), team("tech", 2), team("design", 3)],
      people: [
        person("ok"),
        person("no-consent", { consent: "not-recorded" }),
        person("draft", {}, "draft"),
      ],
      memberships: [
        member("m1", "ok", "t1", "core"),
        member("m2", "no-consent", "t1", "tech"),
        member("m3", "draft", "t1", "design"),
        member("m4", "ok", "t1", "design", { role: NEEDED }),
      ],
    };
    const t1 = selectLegacy(source).terms[0];
    expect(t1.hasPage).toBe(true);
    expect(t1.teams.map((t) => t.id)).toEqual(["core"]);
    expect(t1.teams[0].members.map((m) => m.id)).toEqual(["ok"]);
  });

  it("makes the timeline's page links exactly the generated routes", () => {
    const source: LegacySource = {
      terms: [term("a", "2022-23"), term("b", "2021-22"), term("c", "2020-21")],
      teams: [team("core", 1)],
      people: [person("p1")],
      memberships: [member("m1", "p1", "a", "core"), member("m2", "p1", "c", "core")],
    };
    const content = selectLegacy(source);
    const linked = content.terms.filter((t) => t.hasPage).map((t) => t.id);
    expect(legacyTermPaths(content).map((p) => p.params.term)).toEqual(linked);
    expect(termsWithPages(content).map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("term pages: Also served links", () => {
  const source: LegacySource = {
    terms: [term("t1", "2020-21"), term("t2", "2021-22"), term("t3", "2022-23")],
    teams: [team("core", 1)],
    people: [person("p1"), person("p2", { consent: "not-recorded" })],
    memberships: [
      member("m1", "p1", "t1", "core"),
      member("m2", "p1", "t2", "core"),
      member("m3", "p1", "t3", "core"),
      member("m4", "p2", "t3", "core"),
    ],
  };

  it("points at a term's own page when that term has one", () => {
    const inLatest = selectLegacy(source).terms[0].teams[0].members[0];
    expect(inLatest.alsoServed.map((t) => [t.id, t.href])).toEqual([
      ["t2", "/legacy/t2"],
      ["t1", "/legacy/t1"],
    ]);
  });

  it("never points at a page that is not generated", () => {
    const content = selectLegacy(source);
    const pages = new Set(legacyTermPaths(content).map((p) => `/legacy/${p.params.term}`));
    for (const t of content.terms) {
      for (const tm of t.teams) {
        for (const m of tm.members) {
          for (const link of m.alsoServed) {
            if (link.href.startsWith("/legacy/")) expect(pages.has(link.href)).toBe(true);
            else expect(link.href).toBe(`/legacy#term-${link.id}`);
          }
        }
      }
    }
  });

  it("does not link to a term where the person has no qualifying membership", () => {
    const withFacultyTerm: LegacySource = {
      ...source,
      terms: [...source.terms, term("t4", "2023-24")],
      teams: [...source.teams, team("fac", 9, "Faculty")],
      memberships: [...source.memberships, member("m5", "p1", "t4", "fac")],
    };
    const content = selectLegacy(withFacultyTerm);
    expect(content.terms.find((t) => t.id === "t4")?.hasPage).toBe(false);
    const links = content.terms
      .find((t) => t.id === "t3")
      ?.teams[0].members.find((m) => m.id === "p1")?.alsoServed;
    expect(links?.map((l) => l.id)).toEqual(["t2", "t1"]);
  });

  it("lists a repeated person in each term where they have a qualifying membership", () => {
    expect(roster(source)).toEqual(["t3/core/p1", "t2/core/p1", "t1/core/p1"]);
  });
});

describe("term pages: order and determinism", () => {
  const source: LegacySource = {
    terms: [term("t1", "2020-21")],
    teams: [team("z", 1, "Same"), team("a", 1, "Same"), team("m", 1, "Alpha"), team("late", 5)],
    people: [person("p1"), person("p2"), person("p3"), person("p4")],
    memberships: [
      member("m1", "p1", "t1", "z"),
      member("m2", "p2", "t1", "a"),
      member("m3", "p3", "t1", "m"),
      member("m4", "p4", "t1", "late"),
    ],
  };

  it("orders teams by verified order, then name, then id, and never by a built-in list", () => {
    expect(selectLegacy(source).terms[0].teams.map((t) => t.id)).toEqual(["m", "a", "z", "late"]);
    const reorder: LegacySource = {
      ...source,
      teams: [team("z", 9, "Same"), team("a", 1, "Same")],
    };
    expect(selectLegacy(reorder).terms[0].teams.map((t) => t.id)).toEqual(["a", "z"]);
  });

  it("returns the same content and routes whatever the input order", () => {
    const reversed: LegacySource = {
      terms: [...source.terms].reverse(),
      teams: [...source.teams].reverse(),
      people: [...source.people].reverse(),
      memberships: [...source.memberships].reverse(),
    };
    expect(selectLegacy(reversed)).toEqual(selectLegacy(source));
    expect(legacyTermPaths(selectLegacy(reversed))).toEqual(legacyTermPaths(selectLegacy(source)));
  });
});

describe("term pages: consent and privacy", () => {
  const detailed = (consent: string, status = "verified"): LegacySource =>
    one({
      people: [
        person(
          "secret-id-7",
          {
            consent,
            photo: "/people/test.jpg",
            linkedin: "https://www.linkedin.com/in/test-person",
            bio: "Test bio text",
          },
          status,
        ),
      ],
      memberships: [
        member("m1", "secret-id-7", "t1", "core", { contributions: ["Test contribution"] }),
      ],
    });
  const leaks = /Test Person|test\.jpg|linkedin|Test contribution/;

  it("shows name, photo, LinkedIn and contributions only with recorded consent", () => {
    const shown = JSON.stringify(selectLegacyTerm(selectLegacy(detailed("recorded")), "t1"));
    for (const text of [
      "Test Person",
      "/people/test.jpg",
      "linkedin.com/in/test-person",
      "Test contribution",
    ]) {
      expect(shown).toContain(text);
    }
    const hidden = selectLegacy(detailed("not-recorded"));
    expect(selectLegacyTerm(hidden, "t1")).toBeUndefined();
    expect(JSON.stringify(hidden)).not.toMatch(leaks);
  });

  it("shows nothing for a person who is not verified", () => {
    const hidden = selectLegacy(detailed("recorded", "draft"));
    expect(legacyTermPaths(hidden)).toEqual([]);
    expect(JSON.stringify(hidden)).not.toMatch(leaks);
  });

  it("never exposes the bio, nor the raw person id of an excluded person", () => {
    expect(JSON.stringify(selectLegacy(detailed("recorded")))).not.toContain("Test bio text");
    expect(JSON.stringify(selectLegacy(detailed("not-recorded")))).not.toContain("secret-id-7");
  });

  it("does not turn an unresolved membership into a name", () => {
    const written = one({ memberships: [member("m1", "Written Name Test", "t1", "core")] });
    const content = selectLegacy(written);
    expect(legacyTermPaths(content)).toEqual([]);
    expect(JSON.stringify(content)).not.toContain("Written Name Test");
  });
});
