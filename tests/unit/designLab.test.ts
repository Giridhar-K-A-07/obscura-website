import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HERO_COMPONENTS } from "../../scripts/check-build.mjs";
import {
  CONCEPTS,
  LAB_BASE,
  conceptById,
  conceptPath,
  eventDateParts,
  labStaticPaths,
} from "../../src/design-lab/designLab";

/*
  The design lab (PR #31) is a demo-only exploration. These tests pin what must stay true while it
  exists: it is never emitted in a normal build, it offers exactly three concepts, every concept keeps
  the Master Brief's section order, uses only the pale accent A1, and its hero islands are counted as
  the hero by the build guard.
*/
const LAB_DIR = "src/design-lab";
const read = (path: string) => readFileSync(path, "utf8");
const labFiles = readdirSync(LAB_DIR);

describe("the routes exist only in a demo build", () => {
  it("emits nothing when the build is not a demo build", () => {
    expect(labStaticPaths(false)).toEqual([]);
  });

  it("emits nothing in the test run, where demo mode is off", () => {
    expect(labStaticPaths()).toEqual([]);
  });

  it("emits the index and one page per concept in a demo build", () => {
    expect(labStaticPaths(true)).toEqual([
      { params: { concept: undefined } },
      { params: { concept: "a" } },
      { params: { concept: "b" } },
      { params: { concept: "c" } },
    ]);
  });

  it("builds its pages from that one function, and keeps them out of search indexes", () => {
    const page = read("src/design-lab/DesignLabPage.astro");
    expect(page).toContain("export const getStaticPaths = () => labStaticPaths();");
    expect(page).toMatch(/<BaseLayout[^>]*\bnoindex\b/);
  });

  it("is reached through one address, with a trailing slash", () => {
    expect(LAB_BASE).toBe("/design-lab");
    expect(CONCEPTS.map((c) => conceptPath(c.id))).toEqual([
      "/design-lab/a/",
      "/design-lab/b/",
      "/design-lab/c/",
    ]);
  });
});

describe("the concepts", () => {
  it("are exactly three, with distinct names, and are found by id", () => {
    expect(CONCEPTS.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(new Set(CONCEPTS.map((c) => c.name)).size).toBe(3);
    expect(conceptById("b")?.name).toBe("Instrument");
    expect(conceptById("d")).toBeUndefined();
    expect(conceptById(undefined)).toBeUndefined();
  });

  it("all name the pale accent A1 and no other accent", () => {
    for (const concept of CONCEPTS) {
      expect(concept.recipe, concept.name).toMatch(/accent A1$/);
      expect(concept.recipe, concept.name).not.toMatch(/A[234]/);
    }
  });
});

describe("every concept page", () => {
  const SECTIONS = [
    "top",
    "next-event",
    "introduction",
    "legacy",
    "recent",
    "projects",
    "learning",
  ];

  for (const [index, id] of ["A", "B", "C"].entries()) {
    const source = read(join(LAB_DIR, `Concept${id}.astro`));

    it(`Concept ${id} keeps the Master Brief section order, then the footer`, () => {
      const positions = SECTIONS.map((section) => source.indexOf(`id="${section}"`));
      expect(
        positions.every((p) => p >= 0),
        `${id}: ${positions}`,
      ).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(source.indexOf("<footer")).toBeGreaterThan(positions[positions.length - 1]);
      expect(source).toContain(`data-concept="${CONCEPTS[index].id}"`);
    });

    it(`Concept ${id} hides a section that has no content`, () => {
      for (const guard of ["nextEvent && when &&", "intro &&", "legacy &&", "recent &&"]) {
        expect(source, guard).toContain(`{${guard}`);
      }
      expect(source).toMatch(/\{(lead|projects\.length > 0) &&/);
      expect(source).toContain("{learning &&");
    });

    it(`Concept ${id} writes no club fact of its own`, () => {
      // Copy comes from the content the real homepage uses; no year or count is typed in.
      const markup = source.split("<style")[0].split("---")[2] ?? "";
      expect(markup).not.toMatch(/\b(19|20)\d\d\b/);
    });
  }
});

describe("the colours stay inside the palette: only the pale accent A1", () => {
  // The channels of the provisional palette in src/styles/tokens.css, as space-separated rgb().
  const ALLOWED = new Set([
    "188 205 255", // aperture, the one accent (A1)
    "154 165 180", // mist
    "107 119 136", // haze
    "52 70 92", // slate
    "17 24 38", // chamber (F1)
    "8 11 18", // ink (F1)
    "22 24 29", // chamber (F2)
  ]);
  const concernedFiles = labFiles.filter((f) => /^(Concept|HeroCanvas)/.test(f));

  it("checks the concept pages and both hero islands", () => {
    expect(concernedFiles.sort()).toEqual([
      "ConceptA.astro",
      "ConceptB.astro",
      "ConceptC.astro",
      "HeroCanvasInstrument.css",
      "HeroCanvasInstrument.tsx",
      "HeroCanvasProjection.css",
      "HeroCanvasProjection.tsx",
    ]);
  });

  it("uses no rgb colour outside the palette", () => {
    for (const file of concernedFiles) {
      for (const match of read(join(LAB_DIR, file)).matchAll(/rgb\(\s*(\d+) (\d+) (\d+)/g)) {
        expect(ALLOWED.has(`${match[1]} ${match[2]} ${match[3]}`), `${file}: ${match[0]}`).toBe(
          true,
        );
      }
    }
  });

  it("writes a hex colour only for the F2 foundation, and never an alternative accent", () => {
    for (const file of concernedFiles) {
      const hexes = [...read(join(LAB_DIR, file)).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) =>
        m[0].toLowerCase(),
      );
      for (const hex of hexes) {
        expect(["#0e0f12", "#16181d"], `${file}: ${hex}`).toContain(hex);
        expect(["#8fa8ff", "#a58bff", "#7fd6ff"]).not.toContain(hex);
      }
    }
  });
});

describe("the hero islands", () => {
  const islands = labFiles.filter((f) => /^HeroCanvas.*\.tsx$/.test(f));

  it("are named so the build guard counts them as the hero, not against the page budget", () => {
    expect(islands.length).toBe(2);
    for (const island of islands) {
      expect(
        HERO_COMPONENTS.some((hero: string) => island.startsWith(hero)),
        island,
      ).toBe(true);
    }
  });

  it("each give the visitor a pause control and respect reduced motion", () => {
    for (const island of islands) {
      const source = read(join(LAB_DIR, island));
      expect(source, island).toContain("Pause animation");
      expect(source, island).toContain("usePresence");
      expect(source, island).toContain('aria-hidden="true"');
    }
    expect(read(join(LAB_DIR, "graphFocus.ts"))).toContain("prefers-reduced-motion: reduce");
  });
});

describe("eventDateParts", () => {
  it("reads the day, month and year in the event's own timezone", () => {
    // 20:00 UTC on 31 December is already 1 January in Kolkata.
    const date = new Date("2099-12-31T20:00:00Z");
    expect(eventDateParts(date, "Asia/Kolkata")).toEqual({
      day: "1",
      month: "January",
      year: "2100",
    });
    expect(eventDateParts(date, "UTC")).toEqual({ day: "31", month: "December", year: "2099" });
  });
});
