import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APPROVED_ASSETS, DESCRIPTION_OVERRIDES } from "../../src/lib/launchMetadata";
import { buildMetadata, cleanText, resolveDescription } from "../../src/lib/metadata";

// A fixture host that only exists in these tests. It is not a club or production address.
const SITE = "https://metadata-test.example.org";
const tag = (meta: ReturnType<typeof buildMetadata>, key: string) =>
  meta.tags.find((t) => t.key === key)?.content;
const keys = (meta: ReturnType<typeof buildMetadata>) => meta.tags.map((t) => t.key);

describe("the shipped defaults add nothing the club has not supplied", () => {
  it("has no approved assets and no description overrides", () => {
    expect(APPROVED_ASSETS).toEqual({});
    expect(DESCRIPTION_OVERRIDES).toEqual({});
  });

  it("keeps the site URL unset in the Astro config", () => {
    const config = readFileSync("astro.config.mjs", "utf8");
    expect(config).not.toMatch(/^\s*site\s*:/m);
  });
});

describe("title and description", () => {
  it("passes the page title through, collapsing whitespace", () => {
    expect(buildMetadata({ title: "  Events —   OBSCURA " }).title).toBe("Events — OBSCURA");
  });

  it("falls back to the club name for an empty title, and adds no other words", () => {
    expect(buildMetadata({ title: "   " }).title).toBe("OBSCURA");
  });

  it("keeps the page's own description exactly (the prototype wording is not replaced)", () => {
    const given = "Events & Initiatives Archive. Design prototype; not verified club content.";
    expect(
      buildMetadata({ title: "t", description: given, pathname: "/events/" }).description,
    ).toBe(given);
  });

  it("has no description when the page gives none or an empty one", () => {
    expect(buildMetadata({ title: "t" }).description).toBeUndefined();
    expect(buildMetadata({ title: "t", description: "  " }).description).toBeUndefined();
    expect(keys(buildMetadata({ title: "t" }))).not.toContain("og:description");
    expect(keys(buildMetadata({ title: "t" }))).not.toContain("twitter:description");
  });

  it("never emits a description that still holds a [[NEEDED]] marker", () => {
    expect(cleanText("[[NEEDED: official description]]")).toBeUndefined();
    expect(cleanText("About [[needed: x]] us")).toBeUndefined();
    expect(buildMetadata({ title: "t", description: "[[NEEDED: x]]" }).description).toBeUndefined();
  });

  it("returns text, not markup: escaping is left to the renderer", () => {
    const meta = buildMetadata({ title: 'A "quoted" <b>title</b>', description: "a & b" });
    expect(meta.title).toBe('A "quoted" <b>title</b>');
    expect(meta.description).toBe("a & b");
  });
});

describe("per-page description override", () => {
  const overrides = {
    "/events/": "  Approved launch   description. ",
    "/about": "Approved about.",
  };

  it("replaces the page's description for that path only", () => {
    expect(resolveDescription("/events/", "Prototype text", overrides)).toBe(
      "Approved launch description.",
    );
    expect(resolveDescription("/learn/", "Prototype text", overrides)).toBe("Prototype text");
  });

  it("matches the path however it is written, with or without the trailing slash", () => {
    expect(resolveDescription("/events", "x", overrides)).toBe("Approved launch description.");
    expect(resolveDescription("/about/", "x", overrides)).toBe("Approved about.");
  });

  it("ignores an empty override or one holding a [[NEEDED]] marker", () => {
    expect(resolveDescription("/a/", "kept", { "/a/": "" })).toBe("kept");
    expect(resolveDescription("/a/", "kept", { "/a/": "[[NEEDED: copy]]" })).toBe("kept");
  });

  it("does not depend on the prototype flag", () => {
    const meta = buildMetadata({
      title: "t",
      description: "page",
      pathname: "/events/",
      descriptionOverrides: overrides,
    });
    expect(meta.description).toBe("Approved launch description.");
    expect(tag(meta, "og:description")).toBe("Approved launch description.");
    expect(tag(meta, "twitter:description")).toBe("Approved launch description.");
  });
});

describe("Open Graph and Twitter tags", () => {
  const meta = buildMetadata({
    title: "Events — OBSCURA",
    description: "Page description.",
    pathname: "/events",
    site: SITE,
  });

  it("repeats the real title and description", () => {
    expect(tag(meta, "og:title")).toBe("Events — OBSCURA");
    expect(tag(meta, "og:description")).toBe("Page description.");
    expect(tag(meta, "twitter:title")).toBe("Events — OBSCURA");
    expect(tag(meta, "twitter:description")).toBe("Page description.");
  });

  it("is a website with a plain summary card when there is no image", () => {
    expect(tag(meta, "og:type")).toBe("website");
    expect(tag(meta, "twitter:card")).toBe("summary");
  });

  it("uses the Open Graph `property` and the Twitter `name` attribute", () => {
    expect(
      meta.tags.filter((t) => t.key.startsWith("og:")).every((t) => t.attribute === "property"),
    ).toBe(true);
    expect(
      meta.tags.filter((t) => t.key.startsWith("twitter:")).every((t) => t.attribute === "name"),
    ).toBe(true);
  });

  it("has page URLs only when a production site is configured", () => {
    expect(tag(meta, "og:url")).toBe(`${SITE}/events/`);
    expect(tag(meta, "twitter:url")).toBe(`${SITE}/events/`);
    const unset = buildMetadata({ title: "t", description: "d", pathname: "/events/" });
    expect(keys(unset)).not.toContain("og:url");
    expect(keys(unset)).not.toContain("twitter:url");
    expect(keys(unset)).toEqual([
      "og:title",
      "og:description",
      "og:type",
      "twitter:card",
      "twitter:title",
      "twitter:description",
    ]);
  });

  it("never invents an image: there is none unless an approved asset is supplied", () => {
    for (const m of [meta, buildMetadata({ title: "t", site: SITE, pathname: "/" })]) {
      expect(keys(m).filter((k) => k.includes("image"))).toEqual([]);
    }
  });
});

describe("canonical URL", () => {
  it("is absent when site is unset, including a local or unusable site", () => {
    for (const site of [
      undefined,
      null,
      "",
      "http://localhost:4321",
      "https://localhost",
      "https://127.0.0.1",
    ]) {
      expect(
        buildMetadata({ title: "t", pathname: "/events/", site }).canonical,
        String(site),
      ).toBeUndefined();
    }
  });

  it("is the absolute URL of the page when site is configured", () => {
    expect(buildMetadata({ title: "t", pathname: "/", site: SITE }).canonical).toBe(`${SITE}/`);
    expect(buildMetadata({ title: "t", pathname: "/events", site: SITE }).canonical).toBe(
      `${SITE}/events/`,
    );
    expect(
      buildMetadata({ title: "t", pathname: "/events/a-b/", site: new URL(SITE) }).canonical,
    ).toBe(`${SITE}/events/a-b/`);
  });

  it("is absent for a page that keeps itself out of indexes (404, placeholders), and so is og:url", () => {
    const meta = buildMetadata({ title: "t", pathname: "/404", site: SITE, noindex: true });
    expect(meta.canonical).toBeUndefined();
    expect(keys(meta)).not.toContain("og:url");
    expect(keys(meta)).not.toContain("twitter:url");
  });

  it("is absent for a malformed path, never a malformed URL", () => {
    for (const pathname of ["//evil.example/", "/a/../b/", "/a b/", "events", undefined]) {
      expect(
        buildMetadata({ title: "t", pathname, site: SITE }).canonical,
        String(pathname),
      ).toBeUndefined();
    }
  });
});

describe("favicon hook", () => {
  it("emits no favicon by default", () => {
    expect(buildMetadata({ title: "t" }).favicon).toBeUndefined();
  });

  it("emits one only for an approved site path with a known type", () => {
    const favicon = (path: string) =>
      buildMetadata({ title: "t", assets: { favicon: path } }).favicon;
    expect(favicon("/brand/favicon.svg")).toEqual({
      href: "/brand/favicon.svg",
      type: "image/svg+xml",
    });
    expect(favicon("/favicon.ico")).toEqual({ href: "/favicon.ico", type: "image/x-icon" });
    expect(favicon("/brand/icon.png")?.type).toBe("image/png");
    for (const bad of [
      "https://evil.example/f.svg",
      "//evil.example/f.svg",
      "/f.exe",
      "/f",
      "f.svg",
      "/a b.svg",
    ]) {
      expect(favicon(bad), bad).toBeUndefined();
    }
  });

  it("does not need a site URL", () => {
    expect(
      buildMetadata({ title: "t", assets: { favicon: "/brand/favicon.svg" } }).favicon,
    ).toBeDefined();
  });
});

describe("sharing image hook (empty until the club approves an asset)", () => {
  const assets = { ogImage: { path: "/brand/share.png", alt: "Approved alternative text" } };

  it("emits an absolute image with alt text and a large card, only when site is configured", () => {
    const meta = buildMetadata({ title: "t", pathname: "/", site: SITE, assets });
    expect(tag(meta, "og:image")).toBe(`${SITE}/brand/share.png`);
    expect(tag(meta, "og:image:alt")).toBe("Approved alternative text");
    expect(tag(meta, "twitter:image")).toBe(`${SITE}/brand/share.png`);
    expect(tag(meta, "twitter:card")).toBe("summary_large_image");
  });

  it("is left out without a site, without alt text, or with an unsafe path", () => {
    const withImage = (input: object) =>
      keys(buildMetadata({ title: "t", pathname: "/", ...input })).filter((k) =>
        k.includes("image"),
      );
    expect(withImage({ assets })).toEqual([]);
    expect(
      withImage({ site: SITE, assets: { ogImage: { path: "/brand/share.png", alt: " " } } }),
    ).toEqual([]);
    expect(
      withImage({ site: SITE, assets: { ogImage: { path: "//evil.example/x.png", alt: "a" } } }),
    ).toEqual([]);
    expect(
      withImage({
        site: SITE,
        assets: { ogImage: { path: "https://evil.example/x.png", alt: "a" } },
      }),
    ).toEqual([]);
  });
});

describe("metadata is centralized and changes nothing visible", () => {
  const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");

  it("renders through one component from BaseLayout, which still owns the robots meta tag", () => {
    expect(layout).toContain("<PageMeta");
    expect(layout).toMatch(/isNoindex\(noindex\)/);
    expect(layout).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(layout).not.toMatch(/<title>|name="description"/);
  });

  it("is the only place metadata tags are written", () => {
    const meta = readFileSync("src/components/shell/PageMeta.astro", "utf8");
    expect(meta).not.toMatch(/client:|<script/); // no client JavaScript
    for (const file of [
      "src/pages/index.astro",
      "src/pages/events.astro",
      "src/pages/404.astro",
      "src/layouts/SectionPage.astro",
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/og:|twitter:|rel="canonical"/);
    }
  });

  it("still shows the Prototype notice in prototype mode, and keeps the prototype default", async () => {
    const { PROTOTYPE, siteMode } = await import("../../src/lib/siteMode");
    expect(PROTOTYPE).toBe(true);
    expect(siteMode.showPrototypeNotice).toBe(true);
    expect(siteMode.noindex).toBe(true);
    expect(readFileSync("src/components/home/PrototypeNotice.astro", "utf8")).toMatch(
      /showPrototypeNotice/,
    );
  });
});
