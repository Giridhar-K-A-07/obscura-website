import { describe, expect, it } from "vitest";
import {
  DOWNLOAD_KINDS,
  TRACKS,
  describeReview,
  roadmapPaths,
  selectDownloads,
  selectLearnContent,
  selectRoadmap,
  selectRoadmaps,
  type LearnSource,
} from "../../src/lib/learnContent";
import { selectHomeContent, selectLearning, type HomeSource } from "../../src/lib/homeContent";
import { schemas } from "../../src/lib/schemas";

/*
  Synthetic records for tests only. They are not club data and never leave this file.
  The helpers must work from whatever the records say.
*/
const NEEDED = "[[NEEDED: something]]";

// The helpers read only these fields. `never` lets a short fixture stand in for any record type.
const rec = (id: string, data: Record<string, unknown>): never =>
  ({ id, data: { source: "test", ...data } }) as never;

const step = (n: number, extra: Record<string, unknown> = {}) => ({
  title: `Test step ${n}`,
  why: `Test reason ${n}`,
  resources: [],
  ...extra,
});

const roadmap = (
  id: string,
  track: string,
  extra: Record<string, unknown> = {},
  status = "verified",
) =>
  rec(id, {
    status,
    kind: "roadmap",
    track,
    title: `Test roadmap ${id}`,
    lastReviewed: new Date("2030-03-01"),
    steps: [step(1), step(2), step(3)],
    ...extra,
  });

const download = (
  id: string,
  kind: string,
  extra: Record<string, unknown> = {},
  status = "verified",
) =>
  rec(id, {
    status,
    kind,
    title: `Test download ${id}`,
    link: `https://example.com/files/${id}`,
    licence: "Test licence",
    steps: [],
    ...extra,
  });

const person = (id: string, extra: Record<string, unknown> = {}, status = "verified") =>
  rec(id, { status, name: `Test Person ${id}`, consent: "recorded", ...extra });

const empty: LearnSource = { resources: [], people: [] };
const src = (resources: never[], people: never[] = []): LearnSource => ({ resources, people });

describe("empty states", () => {
  it("returns nothing, so there is no roadmap list, no roadmap page and no downloads", () => {
    expect(selectLearnContent(empty)).toEqual({ roadmaps: [], downloads: [] });
    expect(roadmapPaths(selectRoadmaps(empty))).toEqual([]);
    expect(JSON.stringify(selectLearnContent(empty))).toBe('{"roadmaps":[],"downloads":[]}');
  });

  it("returns nothing when every record is a draft (no draft leakage)", () => {
    const drafts = src([
      roadmap("r", "python", {}, "draft"),
      download("d", "dataset", {}, "draft"),
    ]);
    expect(selectLearnContent(drafts)).toEqual({ roadmaps: [], downloads: [] });
  });

  it("never lets a [[NEEDED]] marker through, even on a record marked verified", () => {
    const marked = src([
      ...["title", "lastReviewed", "track"].map((f, i) =>
        roadmap(`r${i}`, "python", { [f]: NEEDED }),
      ),
      ...["title", "link", "licence"].map((f, i) => download(`d${i}`, "dataset", { [f]: NEEDED })),
    ]);
    expect(selectLearnContent(marked)).toEqual({ roadmaps: [], downloads: [] });
  });

  it("does not show roadmaps because a download exists, or the reverse", () => {
    expect(selectLearnContent(src([download("d", "dataset")])).roadmaps).toEqual([]);
    expect(selectLearnContent(src([roadmap("r", "sql")])).downloads).toEqual([]);
  });
});

describe("roadmap publication", () => {
  it("publishes a verified roadmap with a valid track, a date and a valid step", () => {
    const [r] = selectRoadmaps(src([roadmap("r", "python")]));
    expect(r).toMatchObject({
      id: "r",
      track: "python",
      trackLabel: "Python",
      title: "Test roadmap r",
    });
    expect(r.steps).toHaveLength(3);
  });

  it("keeps the four official track names and ids", () => {
    expect(TRACKS.map((t) => [t.id, t.label])).toEqual([
      ["data-science", "Data Science"],
      ["machine-learning", "Machine Learning"],
      ["python", "Python"],
      ["sql", "SQL"],
    ]);
  });

  it("does not publish a roadmap with an unknown track, no date, or no steps", () => {
    for (const extra of [
      { track: "invented-track" },
      { lastReviewed: undefined },
      { lastReviewed: new Date("x") },
      { steps: [] },
    ]) {
      expect(selectRoadmaps(src([roadmap("r", "python", extra)]))).toEqual([]);
    }
  });

  it("does not treat a non-roadmap kind as a roadmap", () => {
    expect(selectRoadmaps(src([download("d", "dataset", { track: "python" })]))).toEqual([]);
  });

  it("lists published roadmaps in the brief's track order, whatever the input order", () => {
    const resources = [roadmap("s", "sql"), roadmap("d", "data-science"), roadmap("p", "python")];
    const forward = selectRoadmaps(src(resources)).map((r) => r.track);
    expect(forward).toEqual(["data-science", "python", "sql"]);
    expect(selectRoadmaps(src([...resources].reverse())).map((r) => r.track)).toEqual(forward);
  });
});

describe("steps", () => {
  it("numbers steps by their order in the record, starting at 1", () => {
    const r = selectRoadmaps(src([roadmap("r", "python")]))[0];
    expect(r.steps.map((s) => [s.number, s.title])).toEqual([
      [1, "Test step 1"],
      [2, "Test step 2"],
      [3, "Test step 3"],
    ]);
  });

  it("keeps the record's order rather than sorting", () => {
    const steps = [step(9), step(2), step(5)];
    const r = selectRoadmaps(src([roadmap("r", "python", { steps })]))[0];
    expect(r.steps.map((s) => s.title)).toEqual(["Test step 9", "Test step 2", "Test step 5"]);
  });

  it("includes linked resources and omits the list when there are none", () => {
    const steps = [
      step(1, { resources: [{ title: "Test link", url: "https://example.com/a" }] }),
      step(2),
    ];
    const r = selectRoadmaps(src([roadmap("r", "python", { steps })]))[0];
    expect(r.steps[0].resources).toEqual([{ title: "Test link", url: "https://example.com/a" }]);
    expect(r.steps[1].resources).toEqual([]);
  });

  it("fails the whole roadmap closed when any step is malformed", () => {
    const bad = [
      step(2, { title: "" }),
      step(2, { title: NEEDED }),
      step(2, { why: "" }),
      step(2, { why: NEEDED }),
      step(2, { title: undefined }),
      step(2, { resources: [{ title: "Test link", url: "http://example.com" }] }),
      step(2, { resources: [{ title: "Test link", url: "javascript:alert(1)" }] }),
      step(2, { resources: [{ title: "", url: "https://example.com" }] }),
      step(2, { resources: [{ title: "Test link", url: NEEDED }] }),
    ];
    for (const malformed of bad) {
      const steps = [step(1), malformed, step(3)];
      expect(selectRoadmaps(src([roadmap("r", "python", { steps })]))).toEqual([]);
    }
  });
});

describe("duplicate roadmaps for one track", () => {
  it("publishes the one with the newest lastReviewed", () => {
    const resources = [
      roadmap("old", "sql", { lastReviewed: new Date("2029-01-01") }),
      roadmap("new", "sql", { lastReviewed: new Date("2031-01-01") }),
      roadmap("mid", "sql", { lastReviewed: new Date("2030-01-01") }),
    ];
    expect(selectRoadmaps(src(resources)).map((r) => r.id)).toEqual(["new"]);
  });

  it("breaks a date tie by the lowest id, whatever the input order", () => {
    const a = roadmap("a", "sql");
    const b = roadmap("b", "sql");
    expect(selectRoadmaps(src([b, a])).map((r) => r.id)).toEqual(["a"]);
    expect(selectRoadmaps(src([a, b])).map((r) => r.id)).toEqual(["a"]);
  });

  it("ignores an invalid or draft duplicate even if it is newer", () => {
    const resources = [
      roadmap("good", "sql", { lastReviewed: new Date("2029-01-01") }),
      roadmap("broken", "sql", {
        lastReviewed: new Date("2031-01-01"),
        steps: [step(1, { why: "" })],
      }),
      roadmap("draft", "sql", { lastReviewed: new Date("2032-01-01") }, "draft"),
    ];
    expect(selectRoadmaps(src(resources)).map((r) => r.id)).toEqual(["good"]);
  });

  it("keeps different tracks independent", () => {
    const resources = [roadmap("a", "sql"), roadmap("b", "python")];
    expect(selectRoadmaps(src(resources))).toHaveLength(2);
  });
});

describe("reviewer (consent)", () => {
  const reviewerOf = (reviewer: unknown, people: never[]) =>
    selectRoadmaps(src([roadmap("r", "python", { reviewer })], people))[0].reviewer;

  it("names a reviewer who is a verified person with consent recorded", () => {
    expect(reviewerOf("a", [person("a")])).toBe("Test Person a");
  });

  it("omits an absent reviewer, and the roadmap still publishes", () => {
    expect(reviewerOf(undefined, [person("a")])).toBeUndefined();
  });

  it("omits a draft person, a person without recorded consent, a marker name and an unresolved id", () => {
    expect(reviewerOf("a", [person("a", {}, "draft")])).toBeUndefined();
    expect(reviewerOf("a", [person("a", { consent: "not-recorded" })])).toBeUndefined();
    expect(reviewerOf("a", [person("a", { name: NEEDED })])).toBeUndefined();
    expect(reviewerOf("missing-id", [person("a")])).toBeUndefined();
  });

  it("never treats a written name as a person id", () => {
    expect(reviewerOf("Test Person a", [person("a")])).toBeUndefined();
    expect(reviewerOf("Some Written Name", [person("a")])).toBeUndefined();
  });

  it("never exposes the raw id, photo, LinkedIn link or bio", () => {
    const rich = person("secret-id", {
      name: "Test Reviewer Name",
      photo: "/people/secret.jpg",
      linkedin: "https://www.linkedin.com/in/secret",
      bio: "Secret bio",
    });
    const text = JSON.stringify(
      selectRoadmaps(src([roadmap("r", "python", { reviewer: "secret-id" })], [rich])),
    );
    for (const leaked of ["secret-id", "secret.jpg", "linkedin", "Secret bio"]) {
      expect(text).not.toContain(leaked);
    }
    expect(text).toContain("Test Reviewer Name");
  });

  it("writes the review line with the reviewer only when there is one", () => {
    const base = { lastReviewed: new Date("2030-03-01") };
    expect(describeReview(base)).toBe("Last reviewed 1 March 2030");
    expect(describeReview({ ...base, reviewer: "Test Person a" })).toBe(
      "Last reviewed 1 March 2030 by Test Person a",
    );
  });
});

describe("route generation", () => {
  it("generates a roadmap route only for tracks with a verified, valid roadmap", () => {
    const resources = [
      roadmap("a", "python"),
      roadmap("b", "sql", {}, "draft"),
      roadmap("c", "machine-learning", { steps: [] }),
      roadmap("d", "invented"),
      download("e", "dataset"),
    ];
    expect(roadmapPaths(selectRoadmaps(src(resources))).map((p) => p.params)).toEqual([
      { track: "python" },
    ]);
  });

  it("looks a roadmap up by track and finds nothing for a track without one", () => {
    const source = src([roadmap("a", "python")]);
    expect(selectRoadmap(source, "python")?.id).toBe("a");
    expect(selectRoadmap(source, "sql")).toBeUndefined();
    expect(selectRoadmap(source, "invented")).toBeUndefined();
  });

  it("the downloads route does not depend on content: the selector is simply empty", () => {
    expect(selectDownloads([])).toEqual([]);
  });
});

describe("downloads", () => {
  it("publishes a verified download with a valid https link and a licence", () => {
    const [group] = selectDownloads([download("d", "cheat-sheet")]);
    expect(group).toMatchObject({ kind: "cheat-sheet", label: "Cheat sheets" });
    expect(group.items[0]).toEqual({
      id: "d",
      kind: "cheat-sheet",
      title: "Test download d",
      link: "https://example.com/files/d",
      format: undefined,
      size: undefined,
      licence: "Test licence",
    });
  });

  it("rejects unsafe or non-https links", () => {
    for (const link of [
      "http://example.com/a",
      "javascript:alert(1)",
      "data:text/html,x",
      "ftp://example.com/a",
      "//example.com/a",
      "/downloads/local-file.pdf",
      "example.com/a",
      "git@example.com:o/r.git",
      "https://",
      "",
      NEEDED,
      undefined,
    ]) {
      expect(selectDownloads([download("d", "dataset", { link })])).toEqual([]);
    }
  });

  it("does not publish a download without a licence, and never guesses one", () => {
    for (const licence of [undefined, "", "  ", NEEDED]) {
      expect(selectDownloads([download("d", "dataset", { licence })])).toEqual([]);
    }
  });

  it("shows format and size only when the record provides them, exactly as written", () => {
    const [full] = selectDownloads([download("d", "dataset", { format: "CSV", size: "2.5 MB" })]);
    expect(full.items[0]).toMatchObject({ format: "CSV", size: "2.5 MB" });
    const [onlyFormat] = selectDownloads([download("d", "dataset", { format: "CSV" })]);
    expect(onlyFormat.items[0].size).toBeUndefined();
    const [onlySize] = selectDownloads([download("d", "dataset", { size: "40 KB" })]);
    expect(onlySize.items[0].format).toBeUndefined();
  });

  it("does not guess a missing format or size, and drops marker or blank values", () => {
    const [group] = selectDownloads([
      download("d", "dataset", { format: NEEDED, size: "   " }),
      download("e", "cheat-sheet", { link: "https://example.com/files/guide.pdf" }),
    ]);
    expect(group.items[0].format).toBeUndefined();
    expect(group.items[0].size).toBeUndefined();
    const sheets = selectDownloads([
      download("e", "cheat-sheet", { link: "https://example.com/files/guide.pdf" }),
    ])[0];
    expect(sheets.items[0].format).toBeUndefined(); // not guessed from the .pdf extension
  });

  it("ignores roadmaps and unknown kinds", () => {
    expect(selectDownloads([download("a", "roadmap"), download("b", "invented")])).toEqual([]);
  });

  it("groups by kind in a fixed order, alphabetical within a group, regardless of input order", () => {
    const resources = [
      download("1", "dataset", { title: "Test B" }),
      download("2", "cheat-sheet", { title: "Test Z" }),
      download("3", "cheat-sheet", { title: "Test A" }),
      download("4", "code-template", { title: "Test M" }),
    ];
    const forward = selectDownloads(resources);
    expect(DOWNLOAD_KINDS.map((k) => k.id)).toEqual(["cheat-sheet", "code-template", "dataset"]);
    expect(forward.map((g) => g.kind)).toEqual(["cheat-sheet", "code-template", "dataset"]);
    expect(forward[0].items.map((i) => i.title)).toEqual(["Test A", "Test Z"]);
    expect(selectDownloads([...resources].reverse())).toEqual(forward);
  });

  it("omits an empty group", () => {
    expect(selectDownloads([download("a", "dataset")]).map((g) => g.kind)).toEqual(["dataset"]);
  });

  it("returns only the fields the page shows", () => {
    const text = JSON.stringify(
      selectDownloads([download("d", "dataset", { source: "Secret source" })]),
    );
    expect(text).not.toContain("Secret source");
  });
});

describe("homepage and learn selectors agree", () => {
  const resources = [
    roadmap("a", "python"),
    roadmap("b", "sql", { steps: [] }),
    roadmap("c", "data-science", {}, "draft"),
    download("d", "dataset"),
  ];

  it("lists the same tracks, in the same order", () => {
    const learn = selectRoadmaps(src(resources)).map((r) => r.track);
    const home = selectLearning(resources)?.tracks.map((t) => t.id);
    expect(home).toEqual(learn);
    expect(home).toEqual(["python"]);
  });

  it("links the homepage to the on-site roadmap page, never to an external link", () => {
    const withLink = [roadmap("a", "python", { link: "https://example.com/external" })];
    const [track] = selectLearning(withLink)?.tracks ?? [];
    expect(track.roadmap).toEqual({ title: "Test roadmap a", href: "/learn/roadmaps/python" });
    expect(JSON.stringify(track)).not.toContain("example.com");
  });

  it("hides the homepage section when /learn would publish no roadmap", () => {
    expect(
      selectLearning([download("d", "dataset"), roadmap("r", "sql", { steps: [] })]),
    ).toBeNull();
    expect(selectLearning([])).toBeNull();
  });

  it("never links the homepage to a roadmap that has no page", () => {
    const home = selectLearning(resources)?.tracks.map((t) => t.roadmap.href);
    const paths = roadmapPaths(selectRoadmaps(src(resources))).map(
      (p) => `/learn/roadmaps/${p.params.track}`,
    );
    expect(home).toEqual(paths);
  });

  it("keeps the empty homepage result unchanged", () => {
    const emptyHome: HomeSource = {
      site: [],
      events: [],
      posts: [],
      terms: [],
      projects: [],
      people: [],
      resources: [],
    };
    expect(selectHomeContent(emptyHome, new Date("2030-06-15T12:00:00Z")).learning).toBeNull();
  });
});

describe("resources schema (kind-aware validation)", () => {
  const verified = { status: "verified", source: "test", title: "Test resource" };
  const goodStep = { title: "Test step", why: "Test reason" };
  const parse = (data: Record<string, unknown>) =>
    schemas.resources.safeParse({ ...verified, ...data });

  it("accepts a complete verified roadmap, with or without a reviewer and step links", () => {
    expect(
      parse({
        kind: "roadmap",
        track: "python",
        lastReviewed: "2030-03-01",
        steps: [
          goodStep,
          { ...goodStep, resources: [{ title: "Test link", url: "https://example.com" }] },
        ],
      }).success,
    ).toBe(true);
    expect(
      parse({
        kind: "roadmap",
        track: "sql",
        lastReviewed: "2030-03-01",
        steps: [goodStep],
        reviewer: "a",
      }).success,
    ).toBe(true);
  });

  it("rejects a verified roadmap missing its track, steps or lastReviewed", () => {
    const full = {
      kind: "roadmap",
      track: "python",
      lastReviewed: "2030-03-01",
      steps: [goodStep],
    };
    for (const field of ["track", "steps", "lastReviewed"]) {
      const data: Record<string, unknown> = { ...full };
      delete data[field];
      expect(parse(data).success).toBe(false);
    }
  });

  it("accepts a complete verified download, with or without format and size", () => {
    const full = { kind: "dataset", link: "https://example.com/d", licence: "Test licence" };
    expect(parse(full).success).toBe(true);
    expect(parse({ ...full, format: "CSV", size: "1 MB" }).success).toBe(true);
  });

  it("rejects a verified download without an https link or without a licence", () => {
    const full = { kind: "cheat-sheet", link: "https://example.com/d", licence: "Test licence" };
    expect(parse({ ...full, link: undefined }).success).toBe(false);
    expect(parse({ ...full, link: "http://example.com/d" }).success).toBe(false);
    expect(parse({ ...full, link: "javascript:alert(1)" }).success).toBe(false);
    expect(parse({ ...full, licence: undefined }).success).toBe(false);
  });

  it("keeps the [[NEEDED]] prohibition on verified records, including inside steps", () => {
    const base = { kind: "roadmap", track: "python", lastReviewed: "2030-03-01" };
    expect(parse({ ...base, steps: [{ title: NEEDED, why: "Test reason" }] }).success).toBe(false);
    expect(
      parse({ ...base, steps: [{ ...goodStep, resources: [{ title: "x", url: NEEDED }] }] })
        .success,
    ).toBe(false);
    expect(parse({ ...base, steps: [goodStep], reviewer: NEEDED }).success).toBe(false);
  });

  it("lets a draft be incomplete and hold markers", () => {
    const draft = { status: "draft", source: "test", kind: "roadmap", title: NEEDED };
    expect(schemas.resources.safeParse(draft).success).toBe(true);
  });

  it("rejects unknown fields consistently, including in steps", () => {
    const ok = { kind: "dataset", link: "https://example.com/d", licence: "Test licence" };
    expect(parse({ ...ok, difficulty: "easy" }).success).toBe(false);
    const base = { kind: "roadmap", track: "python", lastReviewed: "2030-03-01" };
    expect(parse({ ...base, steps: [{ ...goodStep, duration: "2h" }] }).success).toBe(false);
  });
});
