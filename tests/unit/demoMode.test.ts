import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEMO,
  DEMO_NOW,
  DEMO_PREFIX,
  buildNow,
  clockOffsetMs,
  demoRefusal,
  demoTitle,
} from "../../src/lib/demoMode";
import { PROTOTYPE, siteMode } from "../../src/lib/siteMode";

const read = (path: string) => readFileSync(path, "utf8");

describe("demo mode is off unless asked for", () => {
  it("is off in the test run, with the real clock and the unchanged site mode", () => {
    expect(DEMO).toBe(false);
    expect(Math.abs(buildNow().getTime() - Date.now())).toBeLessThan(5000);
    expect(PROTOTYPE).toBe(true);
    expect(siteMode).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
    expect(clockOffsetMs(new Date("2099-06-15T10:00:00+05:30"))).toBe(0);
  });

  it("puts the demo clock far in the future, so no fixture date can pass for a real one", () => {
    expect(DEMO_NOW.getUTCFullYear()).toBeGreaterThanOrEqual(2090);
  });

  it("prefixes a title only in a demo build, and only once", () => {
    expect(demoTitle("Events")).toBe("Events");
    expect(demoTitle("Events", true)).toBe(`${DEMO_PREFIX}Events`);
    expect(demoTitle(`${DEMO_PREFIX}Events`, true)).toBe(`${DEMO_PREFIX}Events`);
    expect(DEMO_PREFIX).toBe("DEMO — ");
  });
});

describe("a demo build refuses to run where it could be deployed", () => {
  it("is allowed locally and when the flag is off", () => {
    expect(demoRefusal({})).toBeNull();
    expect(demoRefusal({ OBSCURA_DEMO: "1" })).toBeNull();
    expect(demoRefusal({ CI: "true" })).toBeNull(); // not a demo build
    expect(demoRefusal({ VERCEL: "1" })).toBeNull();
  });

  it("is refused in CI or on Vercel unless a second variable allows a check that deploys nothing", () => {
    for (const env of [{ CI: "true" }, { VERCEL: "1" }, { CI: "true", VERCEL: "1" }]) {
      expect(demoRefusal({ OBSCURA_DEMO: "1", ...env })).toMatch(/never be built or deployed/);
      expect(demoRefusal({ OBSCURA_DEMO: "1", OBSCURA_DEMO_ALLOW_CI: "1", ...env })).toBeNull();
    }
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
    for (const name of ["dev", "build", "preview", "verify"]) {
      expect(scripts[name], name).not.toMatch(/demo|OBSCURA_DEMO/i);
    }
    expect(read("scripts/demo.mjs")).toContain('OBSCURA_DEMO: "1"');
    expect(read(".github/workflows/ci.yml")).not.toMatch(/OBSCURA_DEMO|demo/i);
  });

  it("shows the banner on every page through the layout, and a demo build is always a prototype", () => {
    const layout = read("src/layouts/BaseLayout.astro");
    expect(layout).toMatch(/\{DEMO && <DemoBanner \/>\}/);
    expect(layout).toContain('name="obscura-build" content="demo"');
    expect(read("src/components/shell/PageMeta.astro")).toContain("demoTitle(title)");
    expect(read("src/lib/siteMode.ts")).toContain("modeFor(PROTOTYPE || DEMO)");
    const banner = read("src/components/shell/DemoBanner.astro");
    expect(banner).toContain("data-demo-banner");
    expect(banner).toContain("data-demo-badge");
    // It cannot be dismissed: no button, no script, no storage in the markup.
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
    // The client script must not import demo mode (it reads process.env, server side only).
    expect(status.split("<script>")[1]).not.toContain("demoMode");
  });
});
