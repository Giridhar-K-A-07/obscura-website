import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITEMAP_EXCLUDED, robotsTxt, sitemapEnabled, sitemapXml } from "../../src/lib/crawlers";
import { modeFor, siteMode } from "../../src/lib/siteMode";

// A fixture host that only exists in these tests. It is not a club or production address.
const SITE = "https://metadata-test.example.org";
const PROTOTYPE = modeFor(true);
const LAUNCHED = modeFor(false);
const CLOSED = "User-agent: *\nDisallow: /\n";

describe("robots.txt", () => {
  it("disallows everything in the shipped prototype mode, with or without a site", () => {
    expect(siteMode.prototype).toBe(true);
    expect(robotsTxt(undefined)).toBe(CLOSED);
    expect(robotsTxt(SITE)).toBe(CLOSED);
    expect(robotsTxt(SITE, PROTOTYPE)).toBe(CLOSED);
  });

  it("names no host and no sitemap while closed", () => {
    expect(robotsTxt(SITE, PROTOTYPE)).not.toMatch(/Sitemap|https?:/i);
  });

  it("stays closed after launch if there is no usable production site (fails closed)", () => {
    for (const site of [
      undefined,
      null,
      "",
      "http://localhost:4321",
      "https://localhost",
      "https://127.0.0.1",
    ]) {
      expect(robotsTxt(site, LAUNCHED), String(site)).toBe(CLOSED);
    }
  });

  it("allows crawling and names the sitemap only when launched with a real site", () => {
    expect(robotsTxt(SITE, LAUNCHED)).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
    );
    expect(robotsTxt(`${SITE}/club`, LAUNCHED)).toContain(`Sitemap: ${SITE}/club/sitemap.xml`);
  });
});

describe("sitemap", () => {
  const pages = [
    "",
    "events/",
    "events/some-event/",
    "blog/",
    "404",
    "privacy/",
    "events/archive/",
  ];

  it("does not exist in prototype mode, even with a site (no empty sitemap either)", () => {
    expect(sitemapEnabled(SITE, PROTOTYPE)).toBe(false);
    expect(sitemapXml(SITE, pages, PROTOTYPE)).toBeUndefined();
    expect(sitemapXml(SITE, pages)).toBeUndefined(); // the shipped mode
  });

  it("does not exist without a usable site, in either mode", () => {
    for (const site of [
      undefined,
      null,
      "",
      "https://localhost",
      "http://localhost:4321",
      "https://127.0.0.1",
    ]) {
      expect(sitemapEnabled(site, LAUNCHED), String(site)).toBe(false);
      expect(sitemapXml(site, pages, LAUNCHED), String(site)).toBeUndefined();
      expect(sitemapXml(site, pages, PROTOTYPE), String(site)).toBeUndefined();
    }
  });

  it("lists the built pages by their canonical URLs once launched with a real site", () => {
    const xml = sitemapXml(SITE, pages, LAUNCHED)!;
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      `${SITE}/`,
      `${SITE}/blog/`,
      `${SITE}/events/`,
      `${SITE}/events/archive/`,
      `${SITE}/events/some-event/`,
    ]);
  });

  it("leaves out the pages that keep themselves out of indexes", () => {
    const xml = sitemapXml(SITE, pages, LAUNCHED)!;
    expect(SITEMAP_EXCLUDED).toEqual(["/404/", "/privacy/"]);
    expect(xml).not.toMatch(/404|privacy/);
    // The excluded pages really are noindex pages.
    expect(readFileSync("src/pages/404.astro", "utf8")).toMatch(/<BaseLayout[^>]*\bnoindex\b/s);
    expect(readFileSync("src/layouts/SectionPage.astro", "utf8")).toMatch(
      /<BaseLayout[^>]*\bnoindex\b/s,
    );
  });

  it("skips malformed paths and lists each page once", () => {
    const xml = sitemapXml(
      SITE,
      ["events/", "/events", "events/", "//evil.example/", "a/../b/"],
      LAUNCHED,
    )!;
    expect([...xml.matchAll(/<loc>/g)]).toHaveLength(1);
    expect(xml).not.toContain("evil.example");
  });

  it("escapes URLs for XML", () => {
    const xml = sitemapXml(SITE, ["a&b/", "it's/"], LAUNCHED)!;
    expect(xml).toContain("a&amp;b/");
    expect(xml).toContain("it&apos;s/");
  });
});

describe("wiring", () => {
  it("serves robots.txt from the one helper, and writes the sitemap only through it", () => {
    expect(readFileSync("src/pages/robots.txt.ts", "utf8")).toContain("robotsTxt(site)");
    const config = readFileSync("astro.config.mjs", "utf8");
    expect(config).toContain("sitemapXml(");
    expect(config).toMatch(/if \(xml\) writeFileSync/);
    expect(config).not.toMatch(/^\s*site\s*:/m); // no production domain configured
  });

  it("adds no dependency for the sitemap", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(Object.keys(pkg.dependencies).some((name) => /sitemap/.test(name))).toBe(false);
  });
});
