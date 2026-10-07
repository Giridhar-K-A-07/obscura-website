import { describe, expect, it } from "vitest";
import {
  FACULTY_TEAM_NAME,
  isAboutEmpty,
  selectAboutContent,
  selectContact,
  selectFaculty,
  selectIdentity,
  type AboutSource,
} from "../../src/lib/aboutContent";
import { AIM_CATEGORIES, schemas } from "../../src/lib/schemas";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const site = (status: string, extra: Record<string, unknown> = {}) =>
  rec("site", { status, aims: [], ...extra });

const empty: AboutSource = { site: [], people: [], memberships: [], teams: [], terms: [] };

describe("empty state: no content hides every section", () => {
  it("returns nothing when no collection has records", () => {
    const content = selectAboutContent(empty);
    expect(content).toEqual({
      identity: { description: null, vision: null, mission: null, aims: [] },
      faculty: [],
      contact: null,
    });
    expect(isAboutEmpty(content)).toBe(true);
  });

  it("produces no text at all from empty input", () => {
    expect(JSON.stringify(selectAboutContent(empty))).toBe(
      '{"identity":{"description":null,"vision":null,"mission":null,"aims":[]},"faculty":[],"contact":null}',
    );
  });

  it("does not publish a draft site record", () => {
    const draft = site("draft", {
      description: "Test description",
      vision: "Test vision",
      mission: "Test mission",
      aims: [{ category: "Skill Development", text: "Test aim" }],
      contactEmail: "test@example.com",
      affiliation: "Test affiliation",
    });
    expect(selectAboutContent({ ...empty, site: [draft] })).toEqual(selectAboutContent(empty));
  });

  it("never lets a [[NEEDED]] marker through, even on a record marked verified", () => {
    const marked = site("verified", {
      description: NEEDED,
      vision: NEEDED,
      mission: NEEDED,
      aims: [{ category: "Skill Development", text: NEEDED }],
      contactEmail: NEEDED,
      githubOrganisation: NEEDED,
      affiliation: NEEDED,
      foundingDate: NEEDED,
    });
    expect(isAboutEmpty(selectAboutContent({ ...empty, site: [marked] }))).toBe(true);
  });
});

describe("identity", () => {
  it("selects a verified description", () => {
    const identity = selectIdentity([site("verified", { description: "Test description" })]);
    expect(identity.description).toBe("Test description");
  });

  it("hides what is absent and shows only what is verified and present", () => {
    const identity = selectIdentity([site("verified", { vision: "Test vision" })]);
    expect(identity).toEqual({ description: null, vision: "Test vision", mission: null, aims: [] });
  });

  it("passes the club's wording through unchanged", () => {
    const text = "  Test   wording with   odd spacing & symbols  ";
    expect(selectIdentity([site("verified", { mission: text })]).mission).toBe(text);
  });

  it("keeps aims in the official category order, one per category", () => {
    const identity = selectIdentity([
      site("verified", {
        aims: [
          { category: "Community Building", text: "Test C" },
          { category: "Skill Development", text: "Test A" },
          { category: "Skill Development", text: "Test duplicate" },
          { category: "Innovation & Research", text: "Test E" },
        ],
      }),
    ]);
    expect(identity.aims.map((a) => a.category)).toEqual([
      "Skill Development",
      "Innovation & Research",
      "Community Building",
    ]);
    expect(identity.aims[0].text).toBe("Test A");
  });

  it("ignores an aim with an unknown category", () => {
    const identity = selectIdentity([
      site("verified", { aims: [{ category: "Invented Category", text: "Test" }] }),
    ]);
    expect(identity.aims).toEqual([]);
  });

  it("keeps the five official aim categories", () => {
    expect([...AIM_CATEGORIES]).toEqual([
      "Skill Development",
      "Career Exposure",
      "Innovation & Research",
      "Interdepartmental Collaboration",
      "Community Building",
    ]);
  });
});

describe("contact and affiliation", () => {
  it("is null without a verified site record or without any verified value", () => {
    expect(selectContact([])).toBeNull();
    expect(selectContact([site("draft", { contactEmail: "test@example.com" })])).toBeNull();
    expect(selectContact([site("verified", { description: "Test description" })])).toBeNull();
  });

  it("includes only the verified values that exist", () => {
    const contact = selectContact([
      site("verified", { contactEmail: "test@example.com", affiliation: NEEDED }),
    ]);
    expect(contact).toEqual({ contactEmail: "test@example.com" });
  });
});

describe("faculty", () => {
  const team = (id: string, status: string, name: string) => rec(id, { status, name, order: 1 });
  const person = (id: string, status: string, name: string, consent: string) =>
    rec(id, { status, name, consent });
  const membership = (
    id: string,
    status: string,
    p: string,
    t: string,
    term: string,
    role: string,
  ) => rec(id, { status, person: p, team: t, term, role, contributions: [] });
  const term = (id: string, year: string) =>
    rec(id, { status: "verified", name: `Test term ${id}`, academicYear: year, milestones: [] });

  const base: AboutSource = {
    ...empty,
    teams: [team("faculty", "verified", FACULTY_TEAM_NAME), team("core", "verified", "Core Team")],
    people: [
      person("p1", "verified", "Test Person B", "recorded"),
      person("p2", "verified", "Test Person A", "recorded"),
    ],
    terms: [term("t1", "2020-21"), term("t2", "2021-22")],
  };

  it("is empty with no faculty team, so the section is hidden", () => {
    expect(selectFaculty(empty)).toEqual([]);
    const withoutTeam = { ...base, teams: [team("core", "verified", "Core Team")] };
    expect(selectFaculty(withoutTeam)).toEqual([]);
  });

  it("lists verified, consenting people with a verified faculty membership, alphabetically", () => {
    const source = {
      ...base,
      memberships: [
        membership("m1", "verified", "p1", "faculty", "t1", "Test role one"),
        membership("m2", "verified", "p2", "faculty", "t1", "Test role two"),
      ],
    };
    expect(selectFaculty(source).map((f) => f.name)).toEqual(["Test Person A", "Test Person B"]);
  });

  it("excludes unverified memberships, unverified people and people without recorded consent", () => {
    const source: AboutSource = {
      ...base,
      people: [
        person("p1", "verified", "Test Person B", "not-recorded"),
        person("p2", "draft", "Test Person A", "recorded"),
        person("p3", "verified", "Test Person C", "recorded"),
      ],
      memberships: [
        membership("m1", "verified", "p1", "faculty", "t1", "Test role"),
        membership("m2", "verified", "p2", "faculty", "t1", "Test role"),
        membership("m3", "draft", "p3", "faculty", "t1", "Test role"),
      ],
    };
    expect(selectFaculty(source)).toEqual([]);
  });

  it("excludes people whose membership is in another team or has no stated role", () => {
    const source = {
      ...base,
      memberships: [
        membership("m1", "verified", "p1", "core", "t1", "Test role"),
        membership("m2", "verified", "p2", "faculty", "t1", NEEDED),
      ],
    };
    expect(selectFaculty(source)).toEqual([]);
  });

  it("lists a person once, with the role from their newest term", () => {
    const source = {
      ...base,
      memberships: [
        membership("m1", "verified", "p1", "faculty", "t1", "Older role"),
        membership("m2", "verified", "p1", "faculty", "t2", "Newer role"),
      ],
    };
    expect(selectFaculty(source)).toEqual([
      { id: "p1", name: "Test Person B", role: "Newer role" },
    ]);
  });
});

describe("site schema supports partial verification", () => {
  const verified = { status: "verified", source: "test" };

  it("accepts a verified record with only some fields", () => {
    expect(schemas.site.safeParse({ ...verified, description: "Test description" }).success).toBe(
      true,
    );
  });

  it("rejects a verified record whose vision, mission, aims or contact still hold a marker", () => {
    for (const field of ["vision", "mission", "contactEmail"]) {
      expect(schemas.site.safeParse({ ...verified, [field]: NEEDED }).success).toBe(false);
    }
    const aim = { category: "Skill Development", text: NEEDED };
    expect(schemas.site.safeParse({ ...verified, aims: [aim] }).success).toBe(false);
  });

  it("lets a draft hold markers", () => {
    const draft = { status: "draft", source: "test", vision: NEEDED };
    expect(schemas.site.safeParse(draft).success).toBe(true);
  });

  it("accepts only the five official aim categories", () => {
    const aims = (category: string) => [{ category, text: "Test aim" }];
    expect(schemas.site.safeParse({ ...verified, aims: aims("Community Building") }).success).toBe(
      true,
    );
    expect(schemas.site.safeParse({ ...verified, aims: aims("Invented Category") }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields", () => {
    expect(schemas.site.safeParse({ ...verified, tagline: "Test" }).success).toBe(false);
  });
});
