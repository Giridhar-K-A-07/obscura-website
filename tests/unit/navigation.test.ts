import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCurrent, primaryNav } from "../../src/lib/navigation";

const pageFile = (href: string) => `src/pages/${href === "/" ? "index" : href.slice(1)}.astro`;

describe("primary navigation", () => {
  it("lists the requested items in order", () => {
    expect(primaryNav.map((i) => i.label)).toEqual([
      "Home",
      "About",
      "Legacy",
      "Events",
      "Achievements",
      "Projects",
      "Learn",
      "Insights",
    ]);
  });

  it("has unique, root-relative hrefs", () => {
    const hrefs = primaryNav.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href).toMatch(/^\/[a-z]*$/);
  });

  it("only links to pages that exist", () => {
    for (const { href } of primaryNav) expect(existsSync(pageFile(href))).toBe(true);
  });

  it("has the other top-level pages", () => {
    for (const href of ["/privacy", "/404"]) expect(existsSync(pageFile(href))).toBe(true);
  });
});

describe("isCurrent", () => {
  it("matches home only on the root", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/", "/about")).toBe(false);
  });

  it("matches a section and its children, ignoring a trailing slash", () => {
    expect(isCurrent("/events", "/events")).toBe(true);
    expect(isCurrent("/events", "/events/")).toBe(true);
    expect(isCurrent("/events", "/events/some-event")).toBe(true);
  });

  it("does not match a different section with a shared prefix", () => {
    expect(isCurrent("/events", "/eventsarchive")).toBe(false);
    expect(isCurrent("/learn", "/legacy")).toBe(false);
  });
});
