import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  HERO_COMPONENTS,
  JS_BUDGET_BYTES,
  checkBuild,
  readPrototypeFlag,
  scanHtml,
} from "../../scripts/check-build.mjs";

/*
  These tests build small fake dist/ folders and run the real guard on them, so every rule is shown
  to fail on a bad build and pass on a good one. They do not run the Astro build.
*/
const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

const page = (
  body = '<main id="main"><h1>Title</h1></main>',
  head = "",
  { title = "<title>T</title>", robots = true, lang = 'lang="en"' } = {},
) =>
  `<!DOCTYPE html><html ${lang}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${title}${head}` +
  `${robots ? '<meta name="robots" content="noindex, nofollow">' : ""}</head><body>${body}</body></html>`;

const ROBOTS_CLOSED = "User-agent: *\nDisallow: /\n";

/** Writes files (path -> text|Buffer) under a new dist/ folder and returns its path. */
const dist = (files: Record<string, string | Buffer>) => {
  const root = mkdtempSync(join(tmpdir(), "obscura-dist-"));
  folders.push(root);
  const full: Record<string, string | Buffer> = { "robots.txt": ROBOTS_CLOSED, ...files };
  for (const [path, content] of Object.entries(full)) {
    const file = join(root, path);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
};
const run = (files: Record<string, string | Buffer>, prototype = true) =>
  checkBuild(dist(files), { prototype });
const problemsOf = (files: Record<string, string | Buffer>, prototype = true) =>
  run(files, prototype).problems;
const has = (problems: string[], text: string) => problems.some((p) => p.includes(text));

describe("a good build passes", () => {
  it("accepts a minimal prototype build", () => {
    const result = run({ "index.html": page(), "events/index.html": page() });
    expect(result.problems).toEqual([]);
    expect(result.pages.map((p: { route: string }) => p.route).sort()).toEqual(["/", "/events/"]);
  });

  it("fails clearly when there is no dist/ or no pages", () => {
    expect(
      checkBuild(join(tmpdir(), "obscura-no-such-dist"), { prototype: true }).problems[0],
    ).toMatch(/run `npm run build` first/);
    expect(problemsOf({ "robots.txt": ROBOTS_CLOSED })[0]).toMatch(/no HTML pages/);
  });
});

describe("the HTML reader", () => {
  it("does not count tags inside comments, scripts or styles", () => {
    const { tags, scripts } = scanHtml(
      '<!-- <h1>no</h1> --><script>var s = "<h1>no</h1>";</script><style>h1 > a {}</style><h1>yes</h1>',
    );
    expect(tags.filter((t: { name: string }) => t.name === "h1")).toHaveLength(2); // open + close
    expect(scripts).toHaveLength(1);
  });

  it("reads quoted attributes that contain > and entities", () => {
    const { tags } = scanHtml('<a href="/x?a=1&amp;b=2" title="a > b" data-x=y>');
    expect(tags[0].attrs).toEqual({ href: "/x?a=1&b=2", title: "a > b", "data-x": "y" });
  });
});

describe("page structure", () => {
  it.each([
    ["no h1", page('<main id="main"></main>'), "found 0"],
    ["two h1", page('<main id="main"><h1>A</h1><h1>B</h1></main>'), "found 2"],
    ["an empty h1", page('<main id="main"><h1> <span></span> </h1></main>'), "<h1> is empty"],
    ["two titles", page(undefined, "<title>Two</title>"), "exactly one <title>, found 2"],
    ["an empty title", page(undefined, "", { title: "<title> </title>" }), "<title> is empty"],
    ["no title", page(undefined, "", { title: "" }), "exactly one <title>, found 0"],
    ["no lang", page(undefined, "", { lang: "" }), 'lang="en"'],
    ["another language", page(undefined, "", { lang: 'lang="fr"' }), 'lang="en"'],
    ["no main", page("<h1>T</h1>"), "exactly one <main>, found 0"],
    ["two mains", page('<main id="main"><h1>T</h1></main><main></main>'), "found 2"],
    [
      "a duplicate id",
      page('<main id="main"><h1>T</h1><p id="a"></p><p id="a"></p></main>'),
      'duplicate id "a"',
    ],
    ["an img without alt", page('<main id="main"><h1>T</h1><img src="/x.png"></main>'), "no alt"],
  ])("rejects %s", (_name, html, message) => {
    const files: Record<string, string> = { "index.html": html, "x.png": "x" };
    expect(has(problemsOf(files), message)).toBe(true);
  });

  it("accepts an img with empty alt (decorative) and ignores an h1 inside a script", () => {
    const body =
      '<main id="main"><h1>T</h1><img src="/x.png" alt=""><script>"<h1>x</h1>"</script></main>';
    expect(problemsOf({ "index.html": page(body), "x.png": "x" })).toEqual([]);
  });

  it("reports the page by its route", () => {
    const problems = problemsOf({
      "index.html": page(),
      "legacy/term/index.html": page("<h1>T</h1>"),
    });
    expect(problems.every((p) => p.startsWith("/legacy/term/:"))).toBe(true);
  });
});

describe("metadata", () => {
  const SITE = "https://metadata-test.example.org";
  const good =
    `<meta name="description" content="D">` +
    `<link rel="canonical" href="${SITE}/events/">` +
    `<meta property="og:title" content="T"><meta property="og:type" content="website">` +
    `<meta property="og:description" content="D"><meta property="og:url" content="${SITE}/events/">` +
    `<meta name="twitter:card" content="summary"><meta name="twitter:title" content="T">` +
    `<meta name="twitter:url" content="${SITE}/events/">`;
  const events = (head: string) => ({
    "index.html": page(undefined, `<link rel="canonical" href="${SITE}/">`),
    "events/index.html": page(undefined, head),
  });

  it("accepts a complete, consistent set", () => {
    expect(problemsOf(events(good))).toEqual([]);
  });

  it.each([
    ["a relative canonical", good.replace(`${SITE}/events/`, "/events/"), "is not a valid URL"],
    [
      "an http canonical",
      good.replace(
        /https:\/\/metadata-test.example.org\/events\//,
        "http://metadata-test.example.org/events/",
      ),
      "is not https",
    ],
    [
      "a localhost canonical",
      good.replace("metadata-test.example.org", "localhost"),
      "local or reserved",
    ],
    [
      "an IP canonical",
      good.replace("metadata-test.example.org", "192.168.0.1"),
      "local or reserved",
    ],
    ["a canonical with a query", good.replace('events/">', 'events/?a=1">'), "query or fragment"],
    [
      "a canonical for another page",
      good.replace(/\/events\//g, "/learn/"),
      "not this page's address",
    ],
    [
      "two canonicals",
      good + `<link rel="canonical" href="${SITE}/events/">`,
      "more than one canonical",
    ],
    [
      "two descriptions",
      good + '<meta name="description" content="E">',
      "more than one description",
    ],
    ["an empty description", '<meta name="description" content="">', "empty description"],
    ["a duplicate og:title", good + '<meta property="og:title" content="T">', "duplicate og:title"],
    [
      "an empty og:description",
      good.replace('og:description" content="D"', 'og:description" content=""'),
      "empty og:description",
    ],
    [
      "a missing og:type",
      good.replace('<meta property="og:type" content="website">', ""),
      "og:type is missing",
    ],
    [
      "a missing twitter:card",
      good.replace('<meta name="twitter:card" content="summary">', ""),
      "twitter:card is missing",
    ],
    [
      "a bad twitter:card",
      good.replace('content="summary"', 'content="player"'),
      "summary or summary_large_image",
    ],
    [
      "og:url that is not the canonical",
      good.replace('og:url" content="' + SITE + "/events/", 'og:url" content="' + SITE + "/learn/"),
      "og:url",
    ],
    [
      "twitter:url without a canonical",
      good.replace(/<link rel="canonical"[^>]*>/, ""),
      "without a canonical",
    ],
    [
      "an og:title unlike the title",
      good.replace('og:title" content="T"', 'og:title" content="Other"'),
      "og:title differs",
    ],
    [
      "an og:description unlike the description",
      good.replace('og:description" content="D"', 'og:description" content="Other"'),
      "og:description differs",
    ],
    [
      "an og:image without alt",
      good + `<meta property="og:image" content="${SITE}/a.png">`,
      "no og:image:alt",
    ],
    [
      "a local og:image",
      good +
        '<meta property="og:image" content="https://localhost/a.png"><meta property="og:image:alt" content="x">',
      "og:image points at a local",
    ],
  ])("rejects %s", (_name, head, message) => {
    expect(has(problemsOf(events(head)), message)).toBe(true);
  });

  it("accepts an og:image with alt and a large Twitter card", () => {
    const head =
      good.replace('content="summary"', 'content="summary_large_image"') +
      `<meta property="og:image" content="${SITE}/a.png"><meta property="og:image:alt" content="Alt">` +
      `<meta name="twitter:image" content="${SITE}/a.png"><meta name="twitter:image:alt" content="Alt">`;
    expect(problemsOf(events(head))).toEqual([]);
  });

  it("allows a page with no canonical or social tags at all (the shipped prototype)", () => {
    expect(problemsOf({ "index.html": page() })).toEqual([]);
  });
});

describe("canonical URLs are each page's own address on one site (whole URL, never a suffix)", () => {
  const SITE = "https://metadata-test.example.org";
  const canonical = (url: string) => `<link rel="canonical" href="${url}">`;
  const site = (home: string, events: string) => ({
    "index.html": page(undefined, canonical(home)),
    "events/index.html": page(undefined, canonical(events)),
  });

  it("accepts every canonical equal to one origin plus the page's route", () => {
    expect(problemsOf(site(`${SITE}/`, `${SITE}/events/`))).toEqual([]);
  });

  it("rejects a foreign-origin canonical that merely ends with the route", () => {
    const problems = problemsOf(site(`${SITE}/`, "https://evil.example.com/anything/events/"));
    expect(
      has(
        problems,
        "/events/: canonical https://evil.example.com/anything/events/ is not this page's address",
      ),
    ).toBe(true);
    expect(
      has(
        problemsOf(site(`${SITE}/`, "https://evil.example.com/events/")),
        "expected " + SITE + "/events/",
      ),
    ).toBe(true);
    // The reserved form used in reviews is rejected too (by the public-host rule).
    expect(
      problemsOf(site(`${SITE}/`, "https://evil.example/anything/events/")).length,
    ).toBeGreaterThan(0);
    expect(
      problemsOf(site("https://evil.example/anything/", `${SITE}/events/`)).length,
    ).toBeGreaterThan(0);
  });

  it("rejects an extra base path in a page canonical", () => {
    expect(
      has(problemsOf(site(`${SITE}/`, `${SITE}/anything/events/`)), "not this page's address"),
    ).toBe(true);
  });

  it("rejects a home canonical with an arbitrary slash-terminated path", () => {
    const problems = problemsOf(site(`${SITE}/anything/`, `${SITE}/anything/events/`));
    expect(has(problems, "the bare origin")).toBe(true);
    expect(
      has(problemsOf(site(`${SITE}/anything/`, `${SITE}/events/`)), "not this page's address"),
    ).toBe(true);
  });

  it("rejects pages that disagree on the origin, whichever one is wrong", () => {
    expect(
      has(problemsOf(site("https://other.example.org/", `${SITE}/events/`)), "/events/: canonical"),
    ).toBe(true);
    expect(
      has(problemsOf(site(`${SITE}/`, "https://other.example.org/events/")), "/events/: canonical"),
    ).toBe(true);
  });

  it("rejects a page canonical when the home page has none (fail closed)", () => {
    const files = {
      "index.html": page(),
      "events/index.html": page(undefined, canonical(`${SITE}/events/`)),
    };
    expect(has(problemsOf(files), "the home page has no canonical link")).toBe(true);
  });

  it("compares the whole URL: a different scheme case, port or trailing slash is not accepted", () => {
    expect(has(problemsOf(site(`${SITE}/`, `${SITE}/events`)), "not this page's address")).toBe(
      true,
    );
    expect(
      has(
        problemsOf(site(`${SITE}/`, `https://metadata-test.example.org:8443/events/`)),
        "not this page's address",
      ),
    ).toBe(true);
  });

  it("does not allow a canonical on the 404 page", () => {
    const files = {
      ...site(`${SITE}/`, `${SITE}/events/`),
      "404.html": page(undefined, canonical(`${SITE}/404`)),
    };
    expect(has(problemsOf(files), "the 404 page must not have a canonical")).toBe(true);
  });

  it("ties the base-path rule to the Astro config, which sets no `base`", () => {
    expect(readFileSync("astro.config.mjs", "utf8")).not.toMatch(/^\s*base\s*:/m);
  });
});

describe("hosts with a trailing dot are local or reserved too", () => {
  const SITE = "https://metadata-test.example.org";
  it.each([
    "localhost.",
    "foo.example.",
    "foo.test.",
    "foo.invalid.",
    "metadata-test.example.org.",
  ])("rejects %s in a canonical, an og:image and a sitemap URL", (host) => {
    const canonical = `https://${host}/events/`;
    const head =
      `<link rel="canonical" href="${canonical}">` +
      `<meta property="og:title" content="T"><meta property="og:type" content="website">` +
      `<meta property="og:image" content="https://${host}/a.png"><meta property="og:image:alt" content="x">`;
    const problems = problemsOf({
      "index.html": page(undefined, `<link rel="canonical" href="${SITE}/">`),
      "events/index.html": page(undefined, head),
    });
    expect(has(problems, `canonical points at a local or reserved host (${canonical})`)).toBe(true);
    expect(has(problems, "og:image points at a local or reserved host")).toBe(true);
    const launch = problemsOf(
      {
        "index.html": page(undefined, `<link rel="canonical" href="${SITE}/">`, { robots: false }),
        "sitemap.xml": `<urlset><url><loc>${canonical}</loc></url></urlset>`,
      },
      false,
    );
    expect(has(launch, "local or reserved")).toBe(true);
  });
});

describe("the prototype policy", () => {
  it("requires noindex, nofollow on every page, once", () => {
    expect(
      has(
        problemsOf({ "index.html": page(undefined, "", { robots: false }) }),
        "noindex, nofollow",
      ),
    ).toBe(true);
    expect(
      has(
        problemsOf({
          "index.html": page(undefined, '<meta name="robots" content="index, follow">', {
            robots: false,
          }),
        }),
        "noindex, nofollow",
      ),
    ).toBe(true);
    expect(
      has(
        problemsOf({
          "index.html": page(undefined, '<meta name="robots" content="noindex, nofollow">'),
        }),
        "more than one robots",
      ),
    ).toBe(true);
  });

  it("requires a disallow-all robots.txt and no sitemap", () => {
    const base = { "index.html": page() };
    expect(
      has(problemsOf({ ...base, "robots.txt": "User-agent: *\nAllow: /\n" }), "robots.txt"),
    ).toBe(true);
    expect(
      has(
        problemsOf({
          ...base,
          "robots.txt": "User-agent: *\nDisallow: /\nSitemap: https://x.org/s.xml\n",
        }),
        "robots.txt",
      ),
    ).toBe(true);
    expect(
      has(
        problemsOf({ ...base, "robots.txt": "User-agent: *\nDisallow: /private/\n" }),
        "robots.txt",
      ),
    ).toBe(true);
    expect(
      has(problemsOf({ ...base, "sitemap.xml": "<urlset/>" }), "must not publish a sitemap"),
    ).toBe(true);
    const noRobots = dist(base);
    rmSync(join(noRobots, "robots.txt"));
    expect(has(checkBuild(noRobots, { prototype: true }).problems, "robots.txt: missing")).toBe(
      true,
    );
  });

  it("in launch mode lets a page be indexable, still refuses an indexing meta tag that is not noindex", () => {
    expect(problemsOf({ "index.html": page(undefined, "", { robots: false }) }, false)).toEqual([]);
    expect(
      has(
        problemsOf(
          {
            "index.html": page(undefined, '<meta name="robots" content="index">', {
              robots: false,
            }),
          },
          false,
        ),
        "unexpected robots",
      ),
    ).toBe(true);
  });

  describe("in launch mode a sitemap URL must be exactly a built page's canonical URL", () => {
    const SITE = "https://metadata-test.example.org";
    const canonical = (path: string) => `<link rel="canonical" href="${SITE}${path}">`;
    const files = {
      "index.html": page(undefined, canonical("/"), { robots: false }),
      "events/index.html": page(undefined, canonical("/events/"), { robots: false }),
      "404.html": page(undefined, "", { robots: false }),
    };
    const sitemap = (urls: string[]) =>
      `<urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join("")}</urlset>`;
    const launch = (urls: string[]) =>
      problemsOf({ ...files, "sitemap.xml": sitemap(urls) }, false);

    it("accepts the canonical URLs of built pages", () => {
      expect(launch([`${SITE}/`, `${SITE}/events/`])).toEqual([]);
    });

    it("rejects a foreign origin with an otherwise valid built pathname", () => {
      expect(
        has(
          launch(["https://evil.example.com/events/"]),
          "is not the canonical URL of a built page",
        ),
      ).toBe(true);
      expect(
        has(launch(["https://evil.example.com/"]), "is not the canonical URL of a built page"),
      ).toBe(true);
    });

    it("rejects a URL that is not a canonical: unbuilt, no trailing slash, another port, a noindex page", () => {
      for (const url of [
        `${SITE}/gone/`,
        `${SITE}/events`,
        `${SITE}:8443/events/`,
        `${SITE}/404`,
      ]) {
        expect(has(launch([url]), "is not the canonical URL of a built page"), url).toBe(true);
      }
    });

    it("rejects local hosts", () => {
      expect(has(launch(["https://localhost/"]), "local or reserved")).toBe(true);
    });

    it("fails closed: with no canonical on any page, no sitemap URL is accepted", () => {
      const bare = { "index.html": page(undefined, "", { robots: false }) };
      const problems = problemsOf({ ...bare, "sitemap.xml": sitemap([`${SITE}/`]) }, false);
      expect(has(problems, "is not the canonical URL of a built page")).toBe(true);
    });
  });
});

describe("first-party links and assets", () => {
  const body = (extra: string) => `<main id="main"><h1>T</h1>${extra}</main>`;

  it("accepts links to pages, files, fragments and external addresses", () => {
    const html = page(
      body(
        '<a href="/events">e</a><a href="/events/">e</a><a href="/events/#a">a</a><a href="#main">m</a><a href="#">top</a>' +
          '<a href="/cal.ics">c</a><a href="https://example.org/x">x</a><a href="mailto:a@b.org">m</a><a href="//cdn.example.org/x">x</a>',
      ),
      '<link rel="stylesheet" href="/_astro/a.css">',
    );
    const events = page('<main id="main"><h1>E</h1><p id="a"></p></main>');
    expect(
      problemsOf({
        "index.html": html,
        "events/index.html": events,
        "cal.ics": "x",
        "_astro/a.css": "x",
      }),
    ).toEqual([]);
  });

  it("rejects a stylesheet, script, image, link or island URL that points at nothing", () => {
    const html = page(
      body(
        '<a href="/missing/">x</a><img src="/nope.png" alt=""><script src="/_astro/gone.js"></script>',
      ),
      '<link rel="stylesheet" href="/_astro/gone.css">',
    );
    const problems = problemsOf({ "index.html": html });
    for (const url of ["/missing/", "/nope.png", "/_astro/gone.js", "/_astro/gone.css"]) {
      expect(has(problems, `points at nothing in dist/ (${url})`), url).toBe(true);
    }
  });

  it("resolves relative URLs against the page, and keeps them inside dist/", () => {
    const files = {
      "index.html": page(),
      "a/b/index.html": page(
        body('<a href="../../">home</a><a href="../../../../etc/passwd">x</a>'),
      ),
    };
    const problems = problemsOf(files);
    expect(has(problems, '../../"')).toBe(false);
    expect(has(problems, "etc/passwd")).toBe(true);
  });

  it("checks srcset candidates", () => {
    const html = page(body('<img src="/a.png" srcset="/a.png 1x, /b.png 2x" alt="">'));
    expect(has(problemsOf({ "index.html": html, "a.png": "x" }), "/b.png")).toBe(true);
  });

  it("rejects a fragment with no matching id, on the same page and on another", () => {
    const html = page(body('<a href="#nothing">x</a><a href="/events/#also-nothing">y</a>'));
    const problems = problemsOf({ "index.html": html, "events/index.html": page() });
    expect(has(problems, "has no #nothing")).toBe(true);
    expect(has(problems, "has no #also-nothing")).toBe(true);
  });

  it("rejects a javascript: URL", () => {
    expect(
      has(
        problemsOf({ "index.html": page(body('<a href="javascript:alert(1)">x</a>')) }),
        "javascript:",
      ),
    ).toBe(true);
  });
});

describe("first-load JavaScript budget", () => {
  const island = (component: string, renderer = "client.js") =>
    `<astro-island uid="1" component-url="/_astro/${component}" component-export="default" renderer-url="/_astro/${renderer}" client="idle" ssr></astro-island>`;
  const noise = (size: number) => randomBytes(size); // does not compress

  it("states the budget and the hero rule", () => {
    expect(JS_BUDGET_BYTES).toBe(100_000);
    expect(HERO_COMPONENTS).toEqual(["HeroCanvas"]);
  });

  it("excludes the hero island, its renderer and what they import, however big", () => {
    const files = {
      "index.html": page(`<main id="main"><h1>T</h1>${island("HeroCanvas.abc.js")}</main>`),
      "_astro/HeroCanvas.abc.js": 'import"./shared.js";' + noise(150_000).toString("latin1"),
      "_astro/client.js": 'import"./shared.js";',
      "_astro/shared.js": noise(60_000),
    };
    const result = run(files);
    expect(result.problems).toEqual([]);
    const home = result.pages[0];
    expect(home.js.other).toBe(0);
    expect(home.js.hero).toBeGreaterThan(200_000);
  });

  it("counts a hydrated component that is not the hero, with its renderer", () => {
    const files = {
      "index.html": page(`<main id="main"><h1>T</h1>${island("Chart.abc.js")}</main>`),
      "_astro/Chart.abc.js": noise(30_000),
      "_astro/client.js": noise(80_000),
    };
    const problems = problemsOf(files);
    expect(has(problems, "over the 100000 byte budget")).toBe(true);
  });

  it("counts a file the hero shares with a non-hero script (no hero exception for shared code)", () => {
    const files = {
      "index.html": page(
        `<main id="main"><h1>T</h1>${island("HeroCanvas.abc.js")}<script type="module" src="/_astro/menu.js"></script></main>`,
      ),
      "_astro/HeroCanvas.abc.js": 'import"./shared.js";',
      "_astro/client.js": "x",
      "_astro/menu.js": 'import"./shared.js";',
      "_astro/shared.js": noise(120_000),
    };
    expect(has(problemsOf(files), "over the 100000 byte budget")).toBe(true);
  });

  it("counts script src, modulepreload and static imports, but not dynamic import()", () => {
    const small = {
      "index.html": page(
        '<main id="main"><h1>T</h1><script src="/_astro/a.js"></script></main>',
        '<link rel="modulepreload" href="/_astro/b.js">',
      ),
      "_astro/a.js": 'import("./lazy.js");',
      "_astro/b.js": "x",
      "_astro/lazy.js": noise(200_000),
    };
    expect(problemsOf(small)).toEqual([]);
    const big = { ...small, "_astro/a.js": 'import"./lazy.js";' };
    expect(has(problemsOf(big), "over the 100000 byte budget")).toBe(true);
  });

  it("counts inline scripts, and ignores JSON and other non-JavaScript scripts", () => {
    const inline = (code: string, type = "") =>
      `<main id="main"><h1>T</h1><script${type}>${code}</script></main>`;
    const big = noise(120_000).toString("base64");
    expect(
      has(
        problemsOf({ "index.html": page(inline(`var a="${big}";`, ' type="module"')) }),
        "byte budget",
      ),
    ).toBe(true);
    expect(
      problemsOf({ "index.html": page(inline(`{"a":"${big}"}`, ' type="application/json"')) }),
    ).toEqual([]);
  });

  it("treats Astro's hydration runtime as hero only when every island is the hero", () => {
    const runtime =
      `customElements.define("astro-island",class{});` + noise(130_000).toString("base64");
    const heroOnly = {
      "index.html": page(
        `<main id="main"><h1>T</h1>${island("HeroCanvas.a.js")}<script>${runtime}</script></main>`,
      ),
      "_astro/HeroCanvas.a.js": "x",
      "_astro/client.js": "x",
    };
    expect(problemsOf(heroOnly)).toEqual([]);
    const mixed = {
      ...heroOnly,
      "index.html": page(
        `<main id="main"><h1>T</h1>${island("HeroCanvas.a.js")}${island("Other.a.js")}<script>${runtime}</script></main>`,
      ),
      "_astro/Other.a.js": "x",
    };
    expect(has(problemsOf(mixed), "byte budget")).toBe(true);
  });

  it("reports an island URL that does not exist", () => {
    const html = page(`<main id="main"><h1>T</h1>${island("HeroCanvas.gone.js")}</main>`);
    expect(
      has(problemsOf({ "index.html": html, "_astro/client.js": "x" }), "does not exist in dist/"),
    ).toBe(true);
  });
});

describe("the command and its wiring", () => {
  const cli = (root: string) =>
    spawnSync(process.execPath, ["scripts/check-build.mjs", root], { encoding: "utf8" });

  it("exits 0 and reports the numbers for a good build", () => {
    const result = cli(dist({ "index.html": page() }));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("check:build passed: 1 pages");
    expect(result.stdout).toContain("of 100000 bytes gzip");
  });

  it("exits 1 and names the page and the problem for a bad build", () => {
    const result = cli(dist({ "events/index.html": page("<h1>A</h1><h1>B</h1>") }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("check:build failed");
    expect(result.stderr).toContain("/events/: expected exactly one <h1>, found 2");
  });

  it("exits 1 when there is no build", () => {
    expect(cli(join(tmpdir(), "obscura-no-such-dist-cli")).status).toBe(1);
  });

  it("reads the real PROTOTYPE flag from src/lib/siteMode.ts", () => {
    const source = readFileSync("src/lib/siteMode.ts", "utf8");
    expect(readPrototypeFlag(source)).toBe(true);
    expect(readPrototypeFlag("export const PROTOTYPE = false;")).toBe(false);
    expect(() => readPrototypeFlag("const x = 1;")).toThrow(/PROTOTYPE/);
  });

  it("runs after the build in npm run verify and in CI, and adds no dependency", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["check:build"]).toBe("node scripts/check-build.mjs");
    expect(pkg.scripts.verify).toMatch(/npm run build && npm run check:build$/);
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(ci.indexOf("npm run build")).toBeGreaterThan(-1);
    expect(ci.indexOf("npm run check:build")).toBeGreaterThan(ci.indexOf("npm run build"));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(" ")).not.toMatch(
      /lighthouse|playwright|puppeteer|axe|parse5|jsdom|cheerio/,
    );
  });

  it("is documented with what it cannot prove", () => {
    const doc = readFileSync("docs/quality-guard.md", "utf8");
    for (const word of [
      "LCP",
      "CLS",
      "INP",
      "100,000",
      "HeroCanvas",
      "not an accessibility audit",
    ]) {
      expect(doc).toContain(word);
    }
  });
});
