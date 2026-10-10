import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROTOTYPE, isNoindex, modeFor, siteMode } from "../../src/lib/siteMode";

const read = (path: string) => readFileSync(path, "utf8");
/** Every .astro file under a folder, with forward slashes. */
const astroFiles = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return astroFiles(path);
    return entry.name.endsWith(".astro") ? [path] : [];
  });
const files = (pattern: string) => astroFiles(pattern.split("/**")[0]);

describe("the site mode switch", () => {
  it("is the prototype by default: noindex and the notice, exactly as before", () => {
    expect(PROTOTYPE).toBe(true);
    expect(siteMode).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
  });

  it("controls the noindex and the notice from the one flag", () => {
    expect(modeFor(true)).toEqual({ prototype: true, noindex: true, showPrototypeNotice: true });
    expect(modeFor(false)).toEqual({
      prototype: false,
      noindex: false,
      showPrototypeNotice: false,
    });
  });

  it("keeps every page out of indexes in prototype mode, and none in launch mode", () => {
    expect(isNoindex(false, modeFor(true))).toBe(true);
    expect(isNoindex(false, modeFor(false))).toBe(false);
    expect(isNoindex(false)).toBe(true); // the default
  });

  it("keeps the placeholder layout (SectionPage, used by /privacy) out of indexes in every mode", () => {
    // It shows [[NEEDED]] text, so it is never indexable, even once the prototype switch is off.
    expect(read("src/layouts/SectionPage.astro")).toMatch(/<BaseLayout[^>]*\bnoindex\b/s);
    expect(read("src/pages/privacy.astro")).toContain("SectionPage");
    expect(isNoindex(true, modeFor(false))).toBe(true);
  });

  it("keeps a page that asks to stay out of indexes out in every mode", () => {
    expect(isNoindex(true, modeFor(true))).toBe(true);
    expect(isNoindex(true, modeFor(false))).toBe(true);
  });
});

describe("the switch is the only place that decides", () => {
  it("is read by the layout and the notice, so no page has to be edited", () => {
    expect(read("src/layouts/BaseLayout.astro")).toContain("isNoindex(noindex)");
    expect(read("src/components/home/PrototypeNotice.astro")).toContain(
      "siteMode.showPrototypeNotice",
    );
    expect(read("src/components/home/SiteFooter.astro")).toContain("siteMode.prototype");
  });

  it("is not overridden by any page: only the 404 page, the dev preview and the placeholder layout ask for noindex", () => {
    const asks = [...files("src/pages/**/*.astro"), ...astroFiles("src/layouts")].filter(
      (f) => /<BaseLayout[^>]*\bnoindex\b/s.test(read(f)) || /^\s+noindex\s*$/m.test(read(f)),
    );
    // BaseLayout declares the prop itself; the layout file is not a page.
    expect(asks.filter((f) => f !== "src/layouts/BaseLayout.astro").sort()).toEqual([
      "src/layouts/SectionPage.astro",
      "src/pages/404.astro",
      "src/pages/dev/[preview].astro",
    ]);
  });

  it("never hard-codes the prototype notice text outside the notice component", () => {
    const offenders = [...files("src/pages/**/*.astro"), ...files("src/components/**/*.astro")]
      .filter((f) => f !== "src/components/home/PrototypeNotice.astro")
      .filter((f) => read(f).includes("Design prototype."));
    expect(offenders).toEqual([]);
  });

  it("is still the prototype: the flag has not been switched", () => {
    expect(read("src/lib/siteMode.ts")).toMatch(/export const PROTOTYPE = true;/);
  });
});
