import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { findUnsafe } from "../../scripts/check-posts.mjs";
import { selectAboutContent } from "../../src/lib/aboutContent";
import { selectAchievementsContent } from "../../src/lib/achievementsContent";
import { DEMO_NOW } from "../../src/lib/demoMode";
import { selectEventsContent } from "../../src/lib/eventsContent";
import { selectFooter } from "../../src/lib/footerContent";
import { selectHomeContent } from "../../src/lib/homeContent";
import { selectLearnContent } from "../../src/lib/learnContent";
import { selectLegacy } from "../../src/lib/legacyContent";
import { selectMenuEvent } from "../../src/lib/menuContent";
import { selectProjects } from "../../src/lib/projectsContent";
import { schemas } from "../../src/lib/schemas";
import { selectPublicPosts } from "../../src/lib/blogContent";

/*
  The demo fixtures (fixtures/demo/, see src/lib/demoMode.ts) must stay valid against the real
  schemas and must fill every section through the real selectors, so a schema change cannot
  quietly break the demo. They must also stay obviously synthetic and out of content/.
*/
const FIXTURES = "fixtures/demo";
const walk = (folder: string): string[] =>
  existsSync(folder)
    ? readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      })
    : [];

interface Loaded {
  id: string;
  data: Record<string, unknown>;
  body?: string;
  file: string;
}
const COLLECTIONS = Object.keys(schemas) as (keyof typeof schemas)[];

/** Reads one collection folder the way the content loader does: YAML, or front matter plus body. */
function load(collection: string): Loaded[] {
  return walk(join(FIXTURES, collection))
    .filter((f) => /\.(ya?ml|md|mdx)$/.test(f))
    .map((file) => {
      const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const id = (file.split(sep).pop() as string).replace(/\.[^.]+$/, "");
      if (/\.ya?ml$/.test(file)) return { id, data: parse(text), file };
      const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
      if (!match) throw new Error(`${file}: no front matter`);
      return { id, data: parse(match[1]), body: match[2], file };
    });
}
const all = Object.fromEntries(COLLECTIONS.map((c) => [c, load(c)]));
const parsed = (collection: keyof typeof schemas) =>
  all[collection].map((r) => ({
    id: r.id,
    // Dates are strings in the files; the real loader coerces them through the schema.
    data: schemas[collection].parse(r.data) as never,
    body: r.body,
  }));

describe("every fixture is valid against the real schema and plainly synthetic", () => {
  it("has files for every collection", () => {
    for (const c of COLLECTIONS) expect(all[c].length, c).toBeGreaterThan(0);
  });

  it("parses every record with the real schema", () => {
    for (const c of COLLECTIONS) {
      for (const r of all[c]) {
        const result = schemas[c].safeParse(r.data);
        expect(result.success, `${r.file}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    }
  });

  it("marks every record as verified synthetic data, with a DEMO source", () => {
    for (const c of COLLECTIONS) {
      for (const r of all[c]) {
        expect(r.data.status, r.file).toBe("verified");
        expect(String(r.data.source), r.file).toMatch(/^DEMO fixture: synthetic/);
      }
    }
  });

  it("names every person 'Test Person NN' or 'Test Faculty NN', with consent recorded", () => {
    for (const r of all.people) {
      expect(String(r.data.name), r.file).toMatch(/^Test (Person|Faculty) \d\d$/);
      expect(r.data.consent, r.file).toBe("recorded");
    }
  });

  it("uses only reserved example addresses, and no real contact detail", () => {
    const text = walk(FIXTURES)
      .filter((f) => !f.endsWith(".svg"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const hosts = [...text.matchAll(/https?:\/\/([^/\s"')]+)/g)].map((m) => m[1]);
    for (const host of hosts) {
      expect(host, host).toMatch(/^(example\.org|www\.linkedin\.com)$/);
    }
    // The only LinkedIn links are plainly fake profile names.
    for (const m of text.matchAll(/linkedin\.com\/in\/([^\s"']+)/g)) {
      expect(m[1]).toMatch(/^demo-fixture-not-a-person-\d\d$/);
    }
    expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@(?!example\.org)[A-Za-z0-9.-]+/);
    expect(text).not.toMatch(/(\+\d[\d ]{8,}\d|\b\d{10,}\b|\b\d{3}[ -]\d{3}[ -]\d{4}\b)/);
  });

  it("puts every date in the 2090s, far from the real club", () => {
    const text = walk(FIXTURES)
      .filter((f) => /\.(ya?ml|md|mdx)$/.test(f))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const years = [...text.matchAll(/\b(20\d\d)(?=[-–/]|\b)/g)].map((m) => Number(m[1]));
    expect(years.length).toBeGreaterThan(20);
    for (const y of years) expect(y, String(y)).toBeGreaterThanOrEqual(2090);
  });

  it("has every static file it refers to, and bodies that pass the post safety check", () => {
    const text = walk(FIXTURES)
      .filter((f) => /\.(ya?ml|md|mdx)$/.test(f))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    for (const m of text.matchAll(/["(](\/demo\/[^"')\s]+)/g)) {
      expect(existsSync(join(FIXTURES, "public", m[1])), m[1]).toBe(true);
    }
    for (const r of [...all.posts, ...all.events]) {
      if (r.body) expect(findUnsafe(r.body), r.file).toEqual([]);
    }
  });
});

describe("the fixtures fill every section through the real selectors", () => {
  const people = parsed("people");
  const source = {
    site: parsed("site"),
    terms: parsed("terms"),
    teams: parsed("teams"),
    people,
    memberships: parsed("memberships"),
    events: parsed("events"),
    achievements: parsed("achievements"),
    spotlights: parsed("spotlights"),
    projects: parsed("projects"),
    resources: parsed("resources"),
    posts: parsed("posts"),
  };

  it("fills the Legacy Line: three terms, one founding, team groups, repeat members, term pages", () => {
    const legacy = selectLegacy(source as never);
    expect(legacy.terms.map((t) => t.id)).toEqual(["demo-term-c", "demo-term-b", "demo-term-a"]);
    expect(legacy.terms.filter((t) => t.isFounding)).toHaveLength(1);
    expect(legacy.terms.every((t) => t.hasPage && t.teams.length >= 2)).toBe(true);
    const members = legacy.terms.flatMap((t) => t.teams.flatMap((team) => team.members));
    expect(members.some((m) => m.alsoServed.length > 0)).toBe(true);
    expect(members.some((m) => m.linkedin)).toBe(true);
    expect(members.some((m) => m.contributions.length > 1)).toBe(true);
    expect(legacy.milestones.length).toBe(3);
  });

  it("fills About: identity, aims, two faculty, contact", () => {
    const about = selectAboutContent(source as never);
    expect(about.identity.aims).toHaveLength(5);
    expect(
      about.identity.vision && about.identity.mission && about.identity.description,
    ).toBeTruthy();
    expect(about.faculty.map((f) => f.name)).toEqual(["Test Faculty 01", "Test Faculty 02"]);
    expect(about.contact).not.toBeNull();
    expect(selectFooter(source.site as never).email).toBe("demo@example.org");
  });

  it("fills Events with every lifecycle state at the demo clock, and every optional part", () => {
    const events = selectEventsContent(source as never, DEMO_NOW);
    expect(events.all).toHaveLength(9);
    expect(events.upcoming.map((e) => e.id)).toEqual([
      "demo-series-in-progress",
      "demo-workshop-upcoming",
      "demo-hackathon-upcoming",
    ]);
    expect(events.past).toHaveLength(6);
    const talk = events.all.find((e) => e.id === "demo-talk-past");
    expect(talk?.photos).toHaveLength(3);
    expect(talk?.slides).toHaveLength(1);
    expect(talk?.repositories).toHaveLength(1);
    expect(talk?.hasRecap).toBe(true);
    expect(events.all.find((e) => e.id === "demo-outreach-past")?.relatedPost?.id).toBe(
      "demo-recap-article",
    );
    expect(events.all.find((e) => e.id === "demo-career-meet-past")?.end).toBeUndefined();
    const years = new Set(events.past.map((e) => e.start.getUTCFullYear()));
    expect([...years].sort()).toEqual(["2097", "2098", "2099"].map(Number));
    // Exactly one event is running at the demo clock.
    const running = events.upcoming.filter(
      (e) => e.start <= DEMO_NOW && (e.end ?? e.start) >= DEMO_NOW,
    );
    expect(running.map((e) => e.id)).toEqual(["demo-series-in-progress"]);
    expect(selectMenuEvent(source.events as never, DEMO_NOW)).not.toBeNull();
  });

  it("fills Achievements, Projects, Learn and the Blog", () => {
    const achievements = selectAchievementsContent(source as never);
    expect(achievements.winners).toHaveLength(3);
    expect(achievements.winners[0].people.length).toBeGreaterThan(0);
    expect(achievements.spotlights.flatMap((g) => g).length).toBeGreaterThan(0);
    const projects = selectProjects(source as never);
    expect(projects).toHaveLength(4);
    expect(projects.some((p) => p.liveDemo)).toBe(true);
    expect(projects.some((p) => p.datasets.length > 1)).toBe(true);
    const learn = selectLearnContent(source as never);
    expect(learn.roadmaps.map((r) => r.track).sort()).toEqual([
      "data-science",
      "machine-learning",
      "python",
      "sql",
    ]);
    expect(learn.roadmaps.every((r) => r.reviewer)).toBe(true);
    expect(learn.downloads.map((g) => g.kind)).toEqual(["cheat-sheet", "code-template", "dataset"]);
    const posts = selectPublicPosts(
      {
        posts: source.posts,
        people,
        projects: source.projects,
        events: selectEventsContent(source as never, DEMO_NOW).all,
      } as never,
      DEMO_NOW,
    );
    expect(posts).toHaveLength(4);
    expect(posts.some((p) => p.authors.length === 0)).toBe(true);
    expect(posts.some((p) => p.relatedEvent)).toBe(true);
    expect(posts.some((p) => p.relatedProject)).toBe(true);
  });

  it("fills the homepage: next event, intro, legacy, recent, projects and learning", () => {
    const home = selectHomeContent(source as never, DEMO_NOW);
    expect(home.nextEvent).not.toBeNull();
    expect(home.intro).not.toBeNull();
    expect(home.legacy).not.toBeNull();
    expect(home.recent).not.toBeNull();
    expect(home.projects.length).toBeGreaterThan(0);
    expect(home.learning).not.toBeNull();
  });
});

/*
  Synthetic fixture content must never reach content/. The `source` field is only one signal and
  can be edited, so the detector below looks for what the fixtures ARE: their ids, their
  "Test Person NN" names, their demo titles and venues, their example.org contacts, their
  2090s dates and their own words ("synthetic", "fictional"). A real record has none of these.
*/
const TRACES: [string, RegExp][] = [
  ["a DEMO fixture source", /DEMO fixture/i],
  ["a synthetic person name", /\bTest (Person|Faculty) \d\d\b/],
  ["a synthetic person id", /\btest-(person|faculty)-\d\d\b/],
  ["a fixture record id", /\bdemo-[a-z0-9]+(-[a-z0-9]+)+\b/],
  [
    "a demo title or venue",
    /\bDemo (Venue|Term [ABC]|Core Team|Team (Alpha|Beta)|Project (Alpha|Beta|Gamma|Delta)|Hackathon|Workshop|Session Series|Talk with|Outreach Programme|Career Meet|Opening Ceremony|Skills Workshop|Data Challenge|Quiz|\w+ Roadmap|\w+ Cheat Sheet|Notebook Template|Project Layout|Practice Dataset)/,
  ],
  ["an example.org contact", /example\.org/i],
  ["a demo email", /\bdemo@/i],
  ["a fake LinkedIn profile", /demo-fixture-not-a-person/],
  ["a demo static path", /["(\s]\/demo\//],
  ["a date in the 2090s", /\b209\d\b/],
  ["the word synthetic or fictional", /\b(synthetic|fictional)\b/i],
];
const syntheticTraces = (text: string): string[] =>
  TRACES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);

// shortcut: the Faculty team record holds only the name the code requires ("Faculty") and an
// order, so it has nothing synthetic in its text; it is caught by its file name instead.
const NO_TEXT_TRACE = new Set(["teams/demo-faculty.yaml"]);

const fixtureFiles = walk(FIXTURES).filter((f) => /\.(ya?ml|md|mdx)$/.test(f));
const fixtureIds = new Set(
  fixtureFiles.map((f) => (f.split(sep).pop() as string).replace(/\.[^.]+$/, "")),
);
const relFixture = (f: string) => relative(FIXTURES, f).split(sep).join("/");

describe("synthetic data stays out of the real content, even if a fixture is edited or renamed", () => {
  it("finds no fixture trace in anything under content/ or public/", () => {
    for (const file of [...walk("content"), ...walk("public")]) {
      const name = relative(".", file).split(sep).join("/");
      if (name === "content/README.md") continue; // the guide that explains this very rule
      if (/\.(png|jpe?g|svg|ico|webp|avif)$/.test(file)) {
        expect(name.startsWith("public/demo"), name).toBe(false);
        continue;
      }
      expect(syntheticTraces(readFileSync(file, "utf8")), name).toEqual([]);
      const stem = (file.split(sep).pop() as string).replace(/\.[^.]+$/, "");
      // `site` is the one id both folders legitimately share; every other fixture id starts demo- or test-.
      expect(
        /^(demo|test)-/.test(stem) && fixtureIds.has(stem),
        `${name} has a fixture file name`,
      ).toBe(false);
    }
    expect(existsSync("public/demo")).toBe(false);
    expect(existsSync("content/demo")).toBe(false);
  });

  it("detects every fixture from its text alone, with the source line edited and the file renamed", () => {
    const undetected: string[] = [];
    for (const file of fixtureFiles) {
      const edited = readFileSync(file, "utf8").replace(
        /^source:.*$/m,
        'source: "Club announcement, 12 March"',
      );
      const rel = relFixture(file);
      if (syntheticTraces(edited).length === 0 && !NO_TEXT_TRACE.has(rel)) undetected.push(rel);
    }
    expect(undetected).toEqual([]);
  });

  it("names the kind of trace, so a failure says what was copied", () => {
    const text = [
      'title: "Demo Hackathon"',
      'person: "test-person-03"',
      'link: "https://example.org/x"',
      'date: "2098-01-01"',
      'start: "2099-07-12T09:30:00+05:30"',
      "demo-term-a",
    ].join("\n");
    expect(syntheticTraces(text)).toEqual(
      expect.arrayContaining([
        "a demo title or venue",
        "a synthetic person id",
        "an example.org contact",
        "a date in the 2090s",
        "a fixture record id",
      ]),
    );
    expect(syntheticTraces('source: "Club deck p.4"\ndate: "2025-01-25"')).toEqual([]);
  });

  it("does not flag the real club's own years or ordinary words", () => {
    expect(syntheticTraces("2024 2025 2026 2030 2089 2100 Core Team demonstration")).toEqual([]);
  });
});
