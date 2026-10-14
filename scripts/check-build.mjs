// Checks the BUILT site (dist/) against launch-quality constraints that can be decided from the
// static output alone, with no browser. Run after `npm run build`: `npm run check:build`.
//
// What it enforces (see docs/quality-guard.md for the full list and what it cannot prove):
//  - every HTML page: lang="en", a viewport, exactly one non-empty <title>, exactly one non-empty
//    <h1>, exactly one <main>, unique ids, <img> with an alt attribute;
//  - metadata: at most one description/canonical, a well-formed absolute https canonical that is
//    the page's own address, Open Graph / Twitter tags that are complete, not duplicated and agree
//    with each other, and no local or reserved host in any metadata URL;
//  - the prototype policy: while PROTOTYPE is true every page says `noindex, nofollow`, robots.txt
//    disallows everything and there is no sitemap;
//  - first-party links: every local href/src/srcset/island URL points at a file that exists in
//    dist/, and every #fragment points at an id on the page it names;
//  - JavaScript: the gzip size of the JavaScript a page loads on first load, excluding the hero,
//    stays within JS_BUDGET_BYTES.
// It does NOT measure LCP, CLS or INP, and it is not an accessibility audit; those need a real
// browser on a deployed site (docs/quality-guard.md).
//
// No dependency: the HTML is read with the small tokenizer below, which understands comments,
// quoted attributes and the raw-text elements (<script>, <style>) of what Astro emits.

import { Buffer } from "node:buffer";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/** The Master Brief's first-load JavaScript ceiling (§11.3: 100 KB compressed), as 100,000 bytes. */
export const JS_BUDGET_BYTES = 100_000;

/**
 * Hydrated components that are the hero (Master Brief §11.3 excludes the hero from the budget).
 * A component counts as the hero when its built file name starts with one of these. Today that is
 * the Interactive Data Canvas island only.
 */
export const HERO_COMPONENTS = ["HeroCanvas"];

const BASE = "https://dist.invalid"; // only used to resolve relative URLs; never read back
const RAW_TEXT = new Set(["script", "style"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : +name.slice(1);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });

const OPEN_TAG =
  /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Reads an HTML document into its tags. Comments and the contents of <script> and <style> are not
 * tags: scripts are returned separately with their source. Returns
 * { tags: [{ name, attrs, closing, start, end }], scripts: [{ attrs, code }] }.
 */
export function scanHtml(html) {
  const tags = [];
  const scripts = [];
  let i = 0;
  while ((i = html.indexOf("<", i)) !== -1) {
    if (html.startsWith("<!--", i)) {
      const close = html.indexOf("-->", i + 4);
      i = close === -1 ? html.length : close + 3;
      continue;
    }
    OPEN_TAG.lastIndex = i;
    const match = OPEN_TAG.exec(html);
    if (!match) {
      i += 1;
      continue;
    }
    const [whole, slash, rawName, rawAttrs] = match;
    const name = rawName.toLowerCase();
    const attrs = {};
    for (const a of rawAttrs.matchAll(ATTRIBUTE)) {
      const value = a[2] ?? a[3] ?? a[4];
      attrs[a[1].toLowerCase()] = value === undefined ? "" : decode(value);
    }
    const end = i + whole.length;
    tags.push({ name, attrs, closing: slash === "/", start: i, end });
    i = end;
    if (!slash && RAW_TEXT.has(name)) {
      const closeAt = html.toLowerCase().indexOf(`</${name}`, i);
      const stop = closeAt === -1 ? html.length : closeAt;
      if (name === "script") scripts.push({ attrs, code: html.slice(i, stop) });
      i = stop;
    }
  }
  return { tags, scripts };
}

/** The visible text between a tag's end and its closing tag, with markup removed. */
const textAfter = (html, tag) => {
  const close = html.toLowerCase().indexOf(`</${tag.name}`, tag.end);
  const slice = html.slice(tag.end, close === -1 ? html.length : close);
  return decode(slice.replace(/<[^>]*>/g, "")).trim();
};

const hostIsLocal = (host) =>
  host === "localhost" ||
  /^[\d.]+$/.test(host) ||
  host.startsWith("[") ||
  !host.includes(".") ||
  /\.(localhost|test|invalid|example|local|internal)$/.test(host);

/** An absolute https URL on a public host with no credentials, query or fragment; else a reason. */
function badAbsoluteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "is not a valid URL";
  }
  if (url.protocol !== "https:") return "is not https";
  if (url.username || url.password) return "has credentials";
  if (hostIsLocal(url.hostname.toLowerCase())) return "points at a local or reserved host";
  if (url.search || url.hash) return "has a query or fragment";
  return null;
}

const walk = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/** The route a built page answers: dist/events/index.html is /events/, dist/404.html is /404. */
const routeOf = (dist, file) => {
  const rel = relative(dist, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel.replace(/\.html$/, "")}`;
};

/** The file in dist/ that a URL path is served from, or null. */
function fileFor(dist, pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const candidates = path.endsWith("/")
    ? [join(dist, path, "index.html")]
    : [join(dist, path), join(dist, path, "index.html"), join(dist, `${path}.html`)];
  for (const candidate of candidates) {
    const full = resolve(candidate);
    if (!full.startsWith(resolve(dist) + sep)) return null; // never leave dist/
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

const URL_ATTRIBUTES = {
  a: ["href"],
  area: ["href"],
  link: ["href"],
  script: ["src"],
  img: ["src", "srcset"],
  source: ["src", "srcset"],
  iframe: ["src"],
  audio: ["src"],
  video: ["src", "poster"],
  form: ["action"],
  use: ["href"],
};

const srcsetUrls = (value) =>
  value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

/** Reads the page-level facts a check needs. */
function pageFacts(html) {
  const { tags, scripts } = scanHtml(html);
  const open = tags.filter((t) => !t.closing);
  const named = (name) => open.filter((t) => t.name === name);
  const meta = (attr, key) => named("meta").filter((t) => t.attrs[attr]?.toLowerCase() === key);
  return { tags, open, scripts, named, meta };
}

function checkStructure(label, html, facts, problems) {
  const { open, named } = facts;
  const html1 = named("html")[0];
  if (!html1 || html1.attrs.lang !== "en") problems.push(`${label}: <html> must declare lang="en"`);
  if (!facts.meta("name", "viewport").length)
    problems.push(`${label}: missing the viewport meta tag`);

  const titles = named("title");
  if (titles.length !== 1)
    problems.push(`${label}: expected exactly one <title>, found ${titles.length}`);
  else if (!textAfter(html, titles[0])) problems.push(`${label}: the <title> is empty`);

  const h1s = named("h1");
  if (h1s.length !== 1) problems.push(`${label}: expected exactly one <h1>, found ${h1s.length}`);
  else if (!textAfter(html, h1s[0])) problems.push(`${label}: the <h1> is empty`);

  const mains = named("main");
  if (mains.length !== 1)
    problems.push(`${label}: expected exactly one <main>, found ${mains.length}`);

  const seen = new Set();
  const duplicates = new Set();
  for (const tag of open) {
    const id = tag.attrs.id;
    if (id === undefined || id === "") continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  for (const id of duplicates) problems.push(`${label}: duplicate id "${id}"`);

  for (const img of named("img")) {
    if (img.attrs.alt === undefined) {
      problems.push(`${label}: <img src="${img.attrs.src ?? ""}"> has no alt attribute`);
    }
  }
}

function checkMetadata(label, route, html, facts, problems) {
  const { named, meta } = facts;
  const pageTitle = named("title")[0] ? textAfter(html, named("title")[0]) : "";

  const descriptions = meta("name", "description");
  if (descriptions.length > 1) problems.push(`${label}: more than one description meta tag`);
  if (descriptions.some((t) => !(t.attrs.content ?? "").trim())) {
    problems.push(`${label}: empty description meta tag`);
  }

  const canonicals = named("link").filter((t) => t.attrs.rel?.toLowerCase() === "canonical");
  if (canonicals.length > 1) problems.push(`${label}: more than one canonical link`);
  const canonical = canonicals[0]?.attrs.href;
  if (canonicals.length) {
    const reason = canonical ? badAbsoluteUrl(canonical) : "has no href";
    if (reason) problems.push(`${label}: canonical ${reason} (${canonical ?? ""})`);
    else if (!new URL(canonical).pathname.endsWith(route) || route === "/404") {
      problems.push(`${label}: canonical ${canonical} is not this page's address (${route})`);
    }
  }

  const social = (prefix, attr) => {
    const tags = named("meta").filter((t) =>
      (t.attrs[attr] ?? "").toLowerCase().startsWith(prefix),
    );
    const byKey = new Map();
    for (const tag of tags) {
      const key = tag.attrs[attr].toLowerCase();
      byKey.set(key, [...(byKey.get(key) ?? []), (tag.attrs.content ?? "").trim()]);
    }
    for (const [key, values] of byKey) {
      if (values.length > 1) problems.push(`${label}: duplicate ${key} tag`);
      if (values.some((v) => !v)) problems.push(`${label}: empty ${key} tag`);
    }
    return new Map([...byKey].map(([key, values]) => [key, values[0]]));
  };
  const og = social("og:", "property");
  const tw = social("twitter:", "name");

  if (og.size) {
    for (const required of ["og:title", "og:type"]) {
      if (!og.has(required))
        problems.push(`${label}: Open Graph is present but ${required} is missing`);
    }
  }
  if (tw.size) {
    if (!tw.has("twitter:card"))
      problems.push(`${label}: Twitter tags are present but twitter:card is missing`);
    else if (!["summary", "summary_large_image"].includes(tw.get("twitter:card"))) {
      problems.push(`${label}: twitter:card must be summary or summary_large_image`);
    }
  }
  for (const [map, key] of [
    [og, "og:title"],
    [tw, "twitter:title"],
  ]) {
    if (map.has(key) && map.get(key) !== pageTitle) {
      problems.push(`${label}: ${key} differs from the <title>`);
    }
  }
  for (const [map, key] of [
    [og, "og:url"],
    [tw, "twitter:url"],
  ]) {
    const value = map.get(key);
    if (value === undefined) continue;
    if (!canonical) problems.push(`${label}: ${key} is present without a canonical link`);
    else if (value !== canonical)
      problems.push(`${label}: ${key} (${value}) differs from the canonical (${canonical})`);
  }
  for (const key of ["og:image", "twitter:image"]) {
    const value = (key.startsWith("og") ? og : tw).get(key);
    if (value === undefined) continue;
    const reason = badAbsoluteUrl(value);
    if (reason) problems.push(`${label}: ${key} ${reason}`);
    const altKey = `${key}:alt`;
    if (!(key.startsWith("og") ? og : tw).get(altKey))
      problems.push(`${label}: ${key} has no ${altKey}`);
  }
  const description = meta("name", "description")[0]?.attrs.content?.trim();
  if (description && og.has("og:description") && og.get("og:description") !== description) {
    problems.push(`${label}: og:description differs from the description meta tag`);
  }
}

function checkRobots(label, facts, prototype, problems) {
  const robots = facts.meta("name", "robots");
  if (robots.length > 1) problems.push(`${label}: more than one robots meta tag`);
  const content = robots[0]?.attrs.content?.toLowerCase().replace(/\s+/g, "");
  if (prototype) {
    if (content !== "noindex,nofollow") {
      problems.push(
        `${label}: prototype pages must say <meta name="robots" content="noindex, nofollow">`,
      );
    }
  } else if (robots.length && !content.includes("noindex")) {
    problems.push(`${label}: unexpected robots policy "${robots[0].attrs.content}"`);
  }
}

/** Every first-party URL on the page must resolve inside dist/, and every fragment to an id. */
function checkLinks(label, dist, route, facts, idsOf, problems) {
  for (const tag of facts.open) {
    for (const attr of URL_ATTRIBUTES[tag.name] ?? []) {
      const raw = tag.attrs[attr];
      if (raw === undefined) continue;
      if (tag.name === "link" && tag.attrs.rel?.toLowerCase() === "canonical") continue;
      for (const value of attr === "srcset" ? srcsetUrls(raw) : [raw.trim()]) {
        if (value === "") {
          if (attr !== "href") problems.push(`${label}: <${tag.name}> has an empty ${attr}`);
          continue;
        }
        if (/^javascript:/i.test(value)) {
          problems.push(`${label}: <${tag.name} ${attr}> uses a javascript: URL`);
          continue;
        }
        let url;
        try {
          url = new URL(value, BASE + route);
        } catch {
          problems.push(`${label}: <${tag.name} ${attr}="${value}"> is not a valid URL`);
          continue;
        }
        if (url.origin !== BASE) continue; // external, mailto:, tel:, data:
        const target = fileFor(dist, url.pathname);
        if (!target) {
          problems.push(
            `${label}: <${tag.name} ${attr}="${value}"> points at nothing in dist/ (${url.pathname})`,
          );
          continue;
        }
        const fragment = url.hash.slice(1);
        if (fragment && fragment !== "top" && target.endsWith(".html")) {
          const targetIds = idsOf(target);
          let id = fragment;
          try {
            id = decodeURIComponent(fragment);
          } catch {
            /* keep the raw fragment */
          }
          if (!targetIds.has(id))
            problems.push(`${label}: <${tag.name} ${attr}="${value}"> has no #${id} on its page`);
        }
      }
    }
  }
}

// ---- JavaScript -----------------------------------------------------------------------------

const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["']([^"']+\.(?:js|mjs))["']/g;
const HYDRATION_RUNTIME =
  /customElements\.define\(\s*["']astro-island["']|\(self\.Astro\s*\|\|\s*\(self\.Astro\s*=\s*\{\}\)\)\.\w+\s*=/;
const gz = (buffer) => gzipSync(buffer, { level: 9 }).length;

/** A script asset and every module it imports statically, as dist file paths. */
function closure(dist, roots, label, problems) {
  const files = new Set();
  const queue = [...roots];
  while (queue.length) {
    const url = queue.pop();
    const path = fileFor(dist, new URL(url, BASE).pathname);
    if (!path) {
      problems.push(`${label}: JavaScript ${url} does not exist in dist/`);
      continue;
    }
    if (files.has(path)) continue;
    files.add(path);
    const source = readFileSync(path, "latin1");
    const here = `/${relative(dist, path).split(sep).join("/")}`;
    for (const m of source.matchAll(STATIC_IMPORT)) queue.push(new URL(m[1], BASE + here).pathname);
  }
  return files;
}

/**
 * First-load JavaScript for a page, in gzip bytes, split into the hero's share and everything else.
 * First load = scripts the page loads (src, modulepreload, island component/renderer URLs, inline
 * scripts) and the modules those import statically. Dynamic import() is loaded later, so it is not
 * counted. A file reachable from both the hero and anything else counts as non-hero (conservative).
 */
export function measureJs(dist, route, facts, problems = [], label = route) {
  const roots = { hero: [], other: [] };
  const inline = { hero: [], other: [] };
  const islands = facts.open.filter((t) => t.name === "astro-island");
  const isHero = (island) => {
    const name = (island.attrs["component-url"] ?? "").split("/").pop() ?? "";
    return HERO_COMPONENTS.some((hero) => name.startsWith(hero));
  };
  for (const island of islands) {
    for (const attr of ["component-url", "renderer-url", "before-hydration-url"]) {
      if (island.attrs[attr]) roots[isHero(island) ? "hero" : "other"].push(island.attrs[attr]);
    }
  }
  for (const tag of facts.open) {
    if (tag.name === "script" && tag.attrs.src) roots.other.push(tag.attrs.src);
    if (tag.name === "link" && tag.attrs.rel?.toLowerCase() === "modulepreload" && tag.attrs.href) {
      roots.other.push(tag.attrs.href);
    }
  }
  const onlyHeroIslands = islands.length > 0 && islands.every(isHero);
  for (const script of facts.scripts) {
    const type = (script.attrs.type ?? "").toLowerCase();
    if (script.attrs.src || (type && type !== "module" && type !== "text/javascript")) continue;
    const code = script.code;
    if (!code.trim()) continue;
    const bucket = onlyHeroIslands && HYDRATION_RUNTIME.test(code) ? "hero" : "other";
    inline[bucket].push(code);
    for (const m of code.matchAll(STATIC_IMPORT))
      roots[bucket].push(new URL(m[1], BASE + route).pathname);
  }
  const heroFiles = closure(dist, roots.hero, label, problems);
  const otherFiles = closure(dist, roots.other, label, problems);
  const size = (files, codes) =>
    [...files].reduce((sum, f) => sum + gz(readFileSync(f)), 0) +
    codes.reduce((sum, c) => sum + gz(Buffer.from(c)), 0);
  for (const f of otherFiles) heroFiles.delete(f);
  return { other: size(otherFiles, inline.other), hero: size(heroFiles, inline.hero) };
}

// ---- The whole build ------------------------------------------------------------------------

/** Reads `export const PROTOTYPE = true|false;` from src/lib/siteMode.ts. */
export function readPrototypeFlag(siteModeSource) {
  const match = /export const PROTOTYPE\s*=\s*(true|false)\s*;/.exec(siteModeSource);
  if (!match)
    throw new Error("could not find `export const PROTOTYPE = true|false;` in siteMode.ts");
  return match[1] === "true";
}

/** Checks a built site. Returns { problems, pages: [{ route, js: { other, hero } }] }. */
export function checkBuild(dist, { prototype }) {
  const problems = [];
  const pages = [];
  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    return { problems: [`${dist} does not exist: run \`npm run build\` first`], pages };
  }
  const files = walk(dist);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  if (!htmlFiles.length) return { problems: [`${dist} has no HTML pages`], pages };

  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) {
      const html = readFileSync(file, "utf8");
      cache.set(file, { html, facts: pageFacts(html) });
    }
    return cache.get(file);
  };
  const idsOf = (file) =>
    new Set(
      read(file)
        .facts.open.map((t) => t.attrs.id)
        .filter((id) => id !== undefined && id !== ""),
    );

  for (const file of htmlFiles) {
    const route = routeOf(dist, file);
    const label = route;
    const { html, facts } = read(file);
    checkStructure(label, html, facts, problems);
    checkMetadata(label, route, html, facts, problems);
    checkRobots(label, facts, prototype, problems);
    checkLinks(label, dist, route, facts, idsOf, problems);
    const js = measureJs(dist, route, facts, problems, label);
    if (js.other > JS_BUDGET_BYTES) {
      problems.push(
        `${label}: first-load JavaScript is ${js.other} bytes gzip (excluding the hero), over the ${JS_BUDGET_BYTES} byte budget`,
      );
    }
    pages.push({ route, js });
  }

  const robotsFile = join(dist, "robots.txt");
  const sitemaps = files.filter((f) => /(^|[\\/])sitemap[^\\/]*\.xml$/.test(f));
  if (prototype) {
    const robots = existsSync(robotsFile) ? readFileSync(robotsFile, "utf8") : null;
    if (robots === null)
      problems.push("robots.txt: missing (the prototype must publish a disallow-all robots.txt)");
    else {
      const lines = robots
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (
        !lines.some((l) => /^disallow:\s*\/$/i.test(l)) ||
        lines.some((l) => /^(allow|sitemap):/i.test(l))
      ) {
        problems.push(
          "robots.txt: the prototype must disallow everything and name no Allow or Sitemap line",
        );
      }
    }
    for (const sitemap of sitemaps) {
      problems.push(`${relative(dist, sitemap)}: the prototype must not publish a sitemap`);
    }
  } else {
    for (const sitemap of sitemaps) {
      const xml = readFileSync(sitemap, "utf8");
      for (const m of xml.matchAll(/<loc>([^<]*)<\/loc>/g)) {
        const reason = badAbsoluteUrl(decode(m[1]));
        if (reason) problems.push(`${relative(dist, sitemap)}: ${decode(m[1])} ${reason}`);
        else if (!fileFor(dist, new URL(decode(m[1])).pathname)) {
          problems.push(`${relative(dist, sitemap)}: ${decode(m[1])} is not a built page`);
        }
      }
    }
  }
  return { problems, pages };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const dist = resolve(process.argv[2] ?? join(root, "dist"));
  const prototype = readPrototypeFlag(readFileSync(join(root, "src/lib/siteMode.ts"), "utf8"));
  const { problems, pages } = checkBuild(dist, { prototype });
  if (problems.length) {
    console.error(`check:build failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  const heaviest = pages.reduce((a, b) => (b.js.other > a.js.other ? b : a), pages[0]);
  console.log(
    `check:build passed: ${pages.length} pages. Most first-load JavaScript excluding the hero: ` +
      `${heaviest.js.other} of ${JS_BUDGET_BYTES} bytes gzip (${heaviest.route}); ` +
      `hero-only JavaScript, not budgeted: ${Math.max(...pages.map((p) => p.js.hero))} bytes gzip. ` +
      `Mode: ${prototype ? "prototype (noindex)" : "launched"}.`,
  );
}
