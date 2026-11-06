import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO,
  DEMO_NOW,
  DEMO_PREFIX,
  HOSTED_ENV,
  buildNow,
  clockOffsetMs,
  demoRefusal,
  demoTitle,
} from "../../src/lib/demoMode";
import { robotsTxt, sitemapXml } from "../../src/lib/crawlers";
import {
  DEMO_CALENDAR_LABEL,
  DEMO_CALENDAR_MARKER,
  buildEventCalendar,
} from "../../src/lib/eventsCalendar";
import type { PublicEvent } from "../../src/lib/eventsContent";
import { PROTOTYPE, isNoindex, resolveMode, siteMode } from "../../src/lib/siteMode";

const read = (path: string) => readFileSync(path, "utf8");
const SITE = "https://metadata-test.example.org";

/** Loads a module afresh with OBSCURA_DEMO set, so its demo-mode branches really run. */
async function freshWith<T>(value: string, load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.stubEnv("OBSCURA_DEMO", value);
  return load();
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("demo mode is off unless asked for", () => {
  it("is off in the test run, with the real clock and the unchanged site mode", () => {
    expect(DEMO).toBe(false);
    expect(Math.abs(buildNow().getTime() - Date.now())).toBeLessThan(5000);
    expect(PROTOTYPE).toBe(true);
    expect(siteMode).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
    expect(clockOffsetMs(new Date("2099-06-15T10:00:00+05:30"))).toBe(0);
  });

  it.each(["0", "true", "yes", "", " 1", "01"])(
    "treats OBSCURA_DEMO=%j as off (only exactly 1 is on)",
    async (value) => {
      const m = await freshWith(value, () => import("../../src/lib/demoMode"));
      expect(m.DEMO).toBe(false);
      expect(m.buildNow().getTime()).not.toBe(m.DEMO_NOW.getTime());
      expect(m.demoTitle("Events")).toBe("Events");
    },
  );

  it("puts the demo clock far in the future, so no fixture date can pass for a real one", () => {
    expect(DEMO_NOW.getUTCFullYear()).toBeGreaterThanOrEqual(2090);
  });

  it("prefixes a title only when asked, and only once", () => {
    expect(demoTitle("Events")).toBe("Events");
    expect(demoTitle("Events", true)).toBe(`${DEMO_PREFIX}Events`);
    expect(demoTitle(`${DEMO_PREFIX}Events`, true)).toBe(`${DEMO_PREFIX}Events`);
    expect(DEMO_PREFIX).toBe("DEMO — ");
  });
});

describe("with OBSCURA_DEMO=1 the demo branches really run", () => {
  it("turns demo on, fixes the clock and prefixes every title", async () => {
    const m = await freshWith("1", () => import("../../src/lib/demoMode"));
    expect(m.DEMO).toBe(true);
    expect(m.buildNow().getTime()).toBe(m.DEMO_NOW.getTime());
    expect(m.demoTitle("Events")).toBe("DEMO — Events");
  });

  it("computes the clock offset a page's script needs, and zero when demo is off", async () => {
    const m = await freshWith("1", () => import("../../src/lib/demoMode"));
    const real = Date.parse("2026-11-05T00:00:00Z");
    expect(m.clockOffsetMs(m.DEMO_NOW, real)).toBe(m.DEMO_NOW.getTime() - real);
    expect(m.clockOffsetMs(m.DEMO_NOW, real)).toBeGreaterThan(60 * 365 * 24 * 3600 * 1000);
    expect(clockOffsetMs(m.DEMO_NOW, real, false)).toBe(0);
    expect(clockOffsetMs(m.DEMO_NOW, real, true)).toBe(m.DEMO_NOW.getTime() - real);
  });

  it("makes the real site mode a prototype with noindex, the notice, closed robots and no sitemap", async () => {
    const m = await freshWith("1", () => import("../../src/lib/siteMode"));
    expect(m.siteMode).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
    expect(m.isNoindex(false)).toBe(true);
    const crawlers = await import("../../src/lib/crawlers");
    expect(crawlers.robotsTxt(SITE)).toBe("User-agent: *\nDisallow: /\n");
    expect(crawlers.sitemapXml(SITE, ["events/"])).toBeUndefined();
  });
});

describe("a demo build is a prototype even when PROTOTYPE is false", () => {
  const demoMode = resolveMode(false, true);
  const launched = resolveMode(false, false);

  it("keeps noindex, the notice, closed robots and no sitemap in demo, and opens up only without it", () => {
    expect(demoMode).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
    expect(launched).toEqual({ prototype: false, noindex: false, showPrototypeNotice: false });
    expect(resolveMode(true, false)).toEqual(demoMode);
    expect(isNoindex(false, demoMode)).toBe(true);
    expect(isNoindex(false, launched)).toBe(false);
    expect(robotsTxt(SITE, demoMode)).toBe("User-agent: *\nDisallow: /\n");
    expect(robotsTxt(SITE, launched)).toContain("Sitemap:");
    expect(sitemapXml(SITE, ["events/"], demoMode)).toBeUndefined();
    expect(sitemapXml(SITE, ["events/"], launched)).toContain("<loc>");
  });

  it("uses the same resolver for the real mode", () => {
    expect(siteMode).toEqual(resolveMode(PROTOTYPE, DEMO));
  });
});

describe("a demo build refuses to run where it could be deployed", () => {
  it("is allowed locally and when the flag is off", () => {
    expect(demoRefusal({})).toBeNull();
    expect(demoRefusal({ OBSCURA_DEMO: "1" })).toBeNull();
    for (const name of HOSTED_ENV) expect(demoRefusal({ [name]: "true" }), name).toBeNull();
  });

  it.each(HOSTED_ENV)(
    "is refused when %s is set, naming it, unless the override is given",
    (name) => {
      const env = { OBSCURA_DEMO: "1", [name]: "true" };
      expect(demoRefusal(env)).toContain(name);
      expect(demoRefusal(env)).toMatch(/never be built or deployed/);
      expect(demoRefusal({ ...env, OBSCURA_DEMO_ALLOW_CI: "1" })).toBeNull();
      // Any set value counts, so the rule fails closed.
      expect(demoRefusal({ OBSCURA_DEMO: "1", [name]: "false" })).toContain(name);
      expect(demoRefusal({ OBSCURA_DEMO: "1", [name]: "0" })).toContain(name);
    },
  );

  it("covers the hosts that matter", () => {
    for (const name of [
      "CI",
      "VERCEL",
      "NETLIFY",
      "CF_PAGES",
      "GITHUB_ACTIONS",
      "RENDER",
      "RAILWAY_ENVIRONMENT",
    ]) {
      expect(HOSTED_ENV).toContain(name);
    }
  });

  it("is only overridden by the exact value 1", () => {
    for (const value of ["0", "true", "", "yes"]) {
      expect(
        demoRefusal({ OBSCURA_DEMO: "1", CI: "true", OBSCURA_DEMO_ALLOW_CI: value }),
      ).not.toBeNull();
    }
  });
});

describe("demo calendar files are labelled; real ones are not", () => {
  const event: PublicEvent = {
    id: "a",
    title: "Title",
    type: "Talk",
    start: new Date("2099-07-12T04:00:00Z"),
    end: new Date("2099-07-12T06:00:00Z"),
    timezone: "Asia/Kolkata",
    venue: "Venue",
    photos: [],
    slides: [],
    repositories: [],
    hasRecap: false,
  };
  const NOW = new Date("2099-06-15T04:30:00Z");
  const unfold = (text: string) => text.replace(/\r\n[ \t]/g, "").split("\r\n");

  it("adds a machine-readable property and [DEMO] to the summary and description", () => {
    const lines = unfold(buildEventCalendar({ ...event, description: "Some text." }, NOW, true));
    expect(lines).toContain(DEMO_CALENDAR_MARKER);
    expect(lines).toContain("SUMMARY:[DEMO] Title");
    expect(lines.find((l) => l.startsWith("DESCRIPTION:"))).toBe(
      `DESCRIPTION:${DEMO_CALENDAR_LABEL}Synthetic data for design review. Not a real OBSCURA event. Some text.`,
    );
    // Even an event with no description is described as demo data.
    expect(
      unfold(buildEventCalendar(event, NOW, true)).some((l) => l.startsWith("DESCRIPTION:[DEMO] ")),
    ).toBe(true);
  });

  it("puts the marker at calendar level, before any event", () => {
    const lines = unfold(buildEventCalendar(event, NOW, true));
    expect(lines.indexOf(DEMO_CALENDAR_MARKER)).toBeGreaterThan(lines.indexOf("BEGIN:VCALENDAR"));
    expect(lines.indexOf(DEMO_CALENDAR_MARKER)).toBeLessThan(lines.indexOf("BEGIN:VEVENT"));
  });

  it("changes nothing in a normal calendar file", () => {
    for (const text of [buildEventCalendar(event, NOW), buildEventCalendar(event, NOW, false)]) {
      expect(text).not.toMatch(/DEMO|X-OBSCURA/);
    }
    expect(buildEventCalendar(event, NOW)).toBe(buildEventCalendar(event, NOW, false));
  });

  it("is built with the demo flag by the real route", () => {
    expect(read("src/pages/events/[slug].ics.ts")).toContain(
      "buildEventCalendar(props.event, props.now, DEMO)",
    );
  });
});

describe("the wiring keeps synthetic data out of normal builds", () => {
  it("reads fixtures and writes dist-demo only in a demo build", () => {
    const config = read("astro.config.mjs");
    expect(config).toContain('outDir: DEMO ? "./dist-demo" : "./dist"');
    expect(config).toContain('publicDir: DEMO ? "./fixtures/demo/public" : "./public"');
    expect(config).toContain("demoRefusal(process.env)");
    expect(read("src/content.config.ts")).toContain('DEMO ? "./fixtures/demo" : "./content"');
    expect(read(".gitignore")).toMatch(/^dist-demo$/m);
  });

  it("keeps the demo output out of linting, formatting and type checking", () => {
    expect(read("eslint.config.mjs")).toContain('"dist-demo/"');
    expect(read(".prettierignore")).toMatch(/^dist-demo\/$/m);
    expect(read("tsconfig.json")).toContain('"dist-demo"');
  });

  it("clears a cached content store when the mode changes", () => {
    const source = read("src/content.config.ts");
    expect(source).toContain("obscura-content-root");
    expect(source).toMatch(/context\.store\.clear\(\)/);
  });

  it("is only started by the demo scripts, which set the flag for the child process", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(scripts.demo).toBe("node scripts/demo.mjs dev");
    expect(scripts["demo:build"]).toBe("node scripts/demo.mjs build");
    expect(scripts["demo:preview"]).toBe("node scripts/demo.mjs preview");
    for (const name of ["dev", "build", "preview", "verify", "check:build"]) {
      expect(scripts[name], name).not.toMatch(/demo|OBSCURA_DEMO/i);
    }
    expect(read("scripts/demo.mjs")).toContain('OBSCURA_DEMO: "1"');
    expect(read("scripts/demo.mjs")).toContain('"--demo"');
    expect(read(".github/workflows/ci.yml")).not.toMatch(/OBSCURA_DEMO|demo/i);
  });

  it("shows the banner on every page through the layout, and it cannot be dismissed", () => {
    const layout = read("src/layouts/BaseLayout.astro");
    expect(layout).toMatch(/\{DEMO && <DemoBanner \/>\}/);
    expect(layout).toContain('name="obscura-build" content="demo"');
    expect(read("src/components/shell/PageMeta.astro")).toContain("demoTitle(title)");
    const banner = read("src/components/shell/DemoBanner.astro");
    expect(banner).toContain("data-demo-banner");
    expect(banner).toContain("data-demo-badge");
    const markup = banner.replace(/^---[\s\S]*?---/, "");
    expect(markup).not.toMatch(/<button|<script|dismiss|localStorage/i);
  });

  it("takes the build time from one place in every loader", () => {
    for (const file of ["blogData", "eventsData", "homeData", "menuData"]) {
      const source = read(`src/lib/${file}.ts`);
      expect(source, file).toContain("now: Date = buildNow()");
      expect(source, file).not.toContain("new Date()");
    }
  });

  it("keeps the event status script on the demo clock through a data attribute only", () => {
    const status = read("src/components/events/EventStatus.astro");
    expect(status).toContain("data-clock-offset");
    expect(status).toContain("Date.now() + offset");
    expect(status.split("<script>")[1]).not.toContain("demoMode");
  });

  it("documents that switching mode needs a dev-server restart", () => {
    for (const file of ["README.md", "fixtures/demo/README.md", "scripts/demo.mjs"]) {
      expect(read(file), file).toMatch(/restart/i);
    }
  });
});
