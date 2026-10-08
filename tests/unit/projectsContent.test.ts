import { describe, expect, it } from "vitest";
import { isHttpsUrl, selectProjects, type ProjectsSource } from "../../src/lib/projectsContent";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const project = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, {
    status,
    name: `Test project ${id}`,
    description: `Test description ${id}`,
    repository: `https://example.com/org/${id}`,
    datasets: [],
    topics: [],
    contributors: [],
    ...extra,
  });

const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });

const empty: ProjectsSource = { projects: [], people: [] };
const only = (p: never, people: never[] = []) => selectProjects({ projects: [p], people });
const first = (p: never, people: never[] = []) => only(p, people)[0];

describe("zero verified projects", () => {
  it("returns nothing, so only the introduction shows", () => {
    expect(selectProjects(empty)).toEqual([]);
  });

  it("returns nothing when every project is a draft", () => {
    expect(only(project("a", {}, "draft"))).toEqual([]);
  });

  it("never leaks the content of an unverified record", () => {
    const draft = project(
      "a",
      { name: "Secret draft name", liveDemo: "https://example.com/demo" },
      "draft",
    );
    expect(JSON.stringify(only(draft))).not.toContain("Secret draft name");
  });
});

describe("required values", () => {
  it("publishes a verified project with every field it needs", () => {
    expect(first(project("a"))).toEqual({
      id: "a",
      name: "Test project a",
      description: "Test description a",
      repository: "https://example.com/org/a",
      liveDemo: undefined,
      datasets: [],
      topics: [],
      contributors: [],
    });
  });

  it("never publishes a [[NEEDED]] value, even on a record marked verified", () => {
    for (const field of ["name", "description", "repository"]) {
      expect(only(project("a", { [field]: NEEDED }))).toEqual([]);
    }
  });

  it("does not publish a project missing a required value", () => {
    for (const field of ["name", "description", "repository"]) {
      expect(only(project("a", { [field]: "" }))).toEqual([]);
      expect(only(project("a", { [field]: undefined }))).toEqual([]);
    }
  });

  it("returns only the fields the page shows", () => {
    const keys = Object.keys(first(project("a", { source: "Test source", status: "verified" })));
    expect(keys.sort()).toEqual(
      [
        "contributors",
        "datasets",
        "description",
        "id",
        "liveDemo",
        "name",
        "repository",
        "topics",
      ].sort(),
    );
  });
});

describe("link validation", () => {
  it("accepts https URLs and rejects everything else", () => {
    expect(isHttpsUrl("https://example.com/a")).toBe(true);
    for (const bad of [
      NEEDED,
      "",
      "   ",
      undefined,
      42,
      "http://example.com",
      "javascript:alert(1)",
      "data:text/html,x",
      "//example.com",
      "/relative",
      "example.com",
      "https://",
      "https://exa mple.com",
      "git@example.com:org/repo.git",
    ]) {
      expect(isHttpsUrl(bad)).toBe(false);
    }
  });

  it("does not restrict repositories to one host", () => {
    for (const repository of [
      "https://github.com/org/repo",
      "https://gitlab.com/org/repo",
      "https://codeberg.org/org/repo",
    ]) {
      expect(first(project("a", { repository })).repository).toBe(repository);
    }
  });

  it("does not publish a project whose repository is malformed", () => {
    for (const repository of [
      "http://example.com/r",
      "not a url",
      "javascript:alert(1)",
      "git@example.com:o/r.git",
    ]) {
      expect(only(project("a", { repository }))).toEqual([]);
    }
  });

  it("includes a valid live demo and omits a missing or malformed one", () => {
    expect(first(project("a", { liveDemo: "https://example.com/demo" })).liveDemo).toBe(
      "https://example.com/demo",
    );
    for (const liveDemo of [undefined, NEEDED, "http://example.com", "javascript:alert(1)", ""]) {
      const p = first(project("a", { liveDemo }));
      expect(p.liveDemo).toBeUndefined();
      expect(p.name).toBe("Test project a"); // the project itself still publishes
    }
  });

  it("keeps valid dataset links, drops malformed ones, and de-duplicates", () => {
    const datasets = [
      "https://example.com/d1",
      NEEDED,
      "http://example.com/d2",
      "https://example.com/d1",
      "https://example.com/d3",
    ];
    expect(first(project("a", { datasets })).datasets).toEqual([
      "https://example.com/d1",
      "https://example.com/d3",
    ]);
  });

  it("returns an empty dataset list when there are none", () => {
    expect(first(project("a")).datasets).toEqual([]);
  });
});

describe("topics", () => {
  it("keeps verified topics in order, without blanks, markers or duplicates", () => {
    const topics = ["Test topic B", "", NEEDED, "Test topic A", "Test topic B"];
    expect(first(project("a", { topics })).topics).toEqual(["Test topic B", "Test topic A"]);
  });

  it("returns an empty list when there are none", () => {
    expect(first(project("a")).topics).toEqual([]);
  });
});

describe("contributors (consent)", () => {
  const contributors = (ids: string[], people: never[]) =>
    first(project("a", { contributors: ids }), people).contributors;

  it("publishes a name only for a verified person with consent recorded, in the record's order", () => {
    expect(contributors(["b", "a"], [person("a"), person("b")])).toEqual([
      "Test Person b",
      "Test Person a",
    ]);
  });

  it("drops a person without recorded consent, a draft person, a marker name and an unresolved id", () => {
    const people = [
      person("a", { consent: "not-recorded" }),
      person("b", {}, "draft"),
      person("c", { name: NEEDED }),
    ];
    expect(contributors(["a", "b", "c", "missing"], people)).toEqual([]);
  });

  it("never publishes a plain name written in place of an id", () => {
    expect(contributors(["Some Written Name"], [person("a")])).toEqual([]);
  });

  it("lists a person once even if referenced twice", () => {
    expect(contributors(["a", "a"], [person("a")])).toEqual(["Test Person a"]);
  });

  it("still publishes the project when no contributor can be named", () => {
    expect(
      first(project("a", { contributors: ["a"] }), [person("a", { consent: "not-recorded" })]),
    ).toMatchObject({
      name: "Test project a",
      contributors: [],
    });
  });

  it("exposes only the name: no photo, LinkedIn or bio", () => {
    const rich = person("a", {
      photo: "/p.jpg",
      linkedin: "https://linkedin.com/in/x",
      bio: "Test bio",
    });
    const text = JSON.stringify(first(project("a", { contributors: ["a"] }), [rich]));
    for (const leaked of ["p.jpg", "linkedin", "Test bio"]) expect(text).not.toContain(leaked);
  });
});

describe("ordering", () => {
  const projects = [
    project("c", { name: "Test project Charlie" }),
    project("a", { name: "Test project Alpha" }),
    project("b2", { name: "Test project Bravo" }),
    project("b1", { name: "Test project Bravo" }),
  ];

  it("is alphabetical by name, with id as the tie-breaker", () => {
    expect(selectProjects({ projects, people: [] }).map((p) => p.id)).toEqual([
      "a",
      "b1",
      "b2",
      "c",
    ]);
  });

  it("does not depend on input order", () => {
    const forward = selectProjects({ projects, people: [] });
    const reversed = selectProjects({ projects: [...projects].reverse(), people: [] });
    expect(reversed).toEqual(forward);
  });

  it("publishes exactly one project when there is one, and all qualifying ones when there are several", () => {
    expect(selectProjects({ projects: [project("a")], people: [] })).toHaveLength(1);
    expect(selectProjects({ projects, people: [] })).toHaveLength(4);
  });

  it("skips non-qualifying projects without disturbing the rest", () => {
    const mixed = [
      project("a"),
      project("b", {}, "draft"),
      project("c", { repository: "nope" }),
      project("d"),
    ];
    expect(selectProjects({ projects: mixed, people: [] }).map((p) => p.id)).toEqual(["a", "d"]);
  });
});
