import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCurrent, primaryNav } from "../../src/lib/navigation";

const pageFile = (href: string) => `src/pages/${href === "/" ? "index" : href.slice(1)}.astro`;

describe("primary navigation", () => {
  it("lists the requested items in order", () => {
    expect(primaryNav.map((i) => i.label)).toEqual([
      "Legacy",
      "Events",
      "Achievements",
      "Projects",
      "Learn",
      "Blog",
    ]);
  });

  it("leaves Home to the logo and About to the footer (Master Brief §8.2)", () => {
    const hrefs = primaryNav.map((i) => i.href);
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/about");
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
    for (const href of ["/", "/about", "/privacy", "/404"])
      expect(existsSync(pageFile(href))).toBe(true);
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

describe("shared shell", () => {
  const read = (path: string) => readFileSync(path, "utf8");

  it("links the logo to the homepage", () => {
    expect(read("src/components/shell/SiteHeader.astro")).toMatch(/class="brand"\s+href="\/"/);
  });

  it("links About and Privacy from the footer, and prints no [[NEEDED]] placeholder", () => {
    const footer = read("src/components/home/SiteFooter.astro");
    expect(footer).toContain('href="/about"');
    expect(footer).toContain('href="/privacy"');
    expect(footer).not.toContain("Needed");
    expect(footer).not.toContain("[[NEEDED");
    // Contact and GitHub come from the verified site record (src/lib/footerContent.ts).
    expect(footer).toContain("loadFooterContent");
  });
  it("keeps the primary links, aria-current, and the menu script, and adds the next event", () => {
    const header = read("src/components/shell/SiteHeader.astro");
    expect(header).toContain("primaryNav.map");
    expect(header.match(/aria-current=/g)?.length).toBeGreaterThanOrEqual(3);
    expect(header).toContain("data-menu");
    // The next event comes from the canonical selector, not from filtering written in the header.
    expect(header).toContain("loadMenuEvent");
    expect(header).toContain("{nextEvent && (");
    expect(header).not.toContain("getCollection");
    // The event row follows the primary links, and desktop does not show it.
    expect(header.indexOf("primaryNav.map")).toBeLessThan(header.indexOf("{nextEvent && ("));
    expect(header).toMatch(/min-width: 1025px\) \{\s*[^}]*\.next-event \{\s*display: none;/);
  });
});
