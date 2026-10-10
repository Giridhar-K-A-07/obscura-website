import { siteMode, type SiteMode } from "./siteMode";
import { absoluteUrl, pagePath } from "./siteUrl";

/*
  What crawlers are told: robots.txt and the sitemap. Both follow the site mode (siteMode.ts) and
  the configured production `site`, and both fail closed.

  - While the site is a prototype, or `site` is not set or not usable, robots.txt disallows
    everything and there is no sitemap at all (not an empty one). The robots meta tag in BaseLayout
    stays the page-level policy; this only stops well-behaved crawlers from fetching the pages.
  - When the site is launched with a real `site`, robots.txt allows crawling and names the sitemap,
    and the sitemap lists the built pages by their canonical URLs.
  Launching is still the single flag in siteMode.ts plus a real `site` in astro.config.mjs.
*/

/** Pages that keep themselves out of indexes in every mode, so they are never listed. */
export const SITEMAP_EXCLUDED = ["/404/", "/privacy/"];

export const SITEMAP_PATH = "/sitemap.xml";

const CLOSED_ROBOTS = "User-agent: *\nDisallow: /\n";

/** Whether the sitemap (and its robots.txt line) exists: launched, with a usable `site`. */
export const sitemapEnabled = (
  site: string | URL | null | undefined,
  mode: SiteMode = siteMode,
): boolean => !mode.noindex && absoluteUrl(site, "/") !== undefined;

export function robotsTxt(
  site: string | URL | null | undefined,
  mode: SiteMode = siteMode,
): string {
  if (!sitemapEnabled(site, mode)) return CLOSED_ROBOTS;
  const sitemap = absoluteUrl(site, "/")!.replace(/\/$/, "") + SITEMAP_PATH;
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * The sitemap for the built pages, or undefined when it must not exist. `pathnames` are the routes
 * of the built HTML pages, with or without the leading slash.
 */
export function sitemapXml(
  site: string | URL | null | undefined,
  pathnames: readonly string[],
  mode: SiteMode = siteMode,
): string | undefined {
  if (!sitemapEnabled(site, mode)) return undefined;
  const urls = new Set<string>();
  for (const pathname of pathnames) {
    const path = pagePath(pathname.startsWith("/") ? pathname : `/${pathname}`);
    if (!path || SITEMAP_EXCLUDED.includes(path)) continue;
    const url = absoluteUrl(site, path);
    if (url) urls.add(url);
  }
  const entries = [...urls]
    .sort()
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (entries ? `${entries}\n` : "") +
    "</urlset>\n"
  );
}
