/*
  Absolute URLs for the site, built only from a real production `site`.

  `site` in astro.config.mjs is deliberately unset until the club chooses a domain (Master Brief
  §15, C7). Until then nothing here produces an absolute URL, so no page, sitemap or robots file
  can point at a made-up host. A configured `site` is trusted only if it looks like a real public
  address: `https`, a dotted host name that is not local, reserved or an IP address, with no
  credentials, query or fragment. Anything else is treated as "not configured".
*/

/** Names that can never be a production host (RFC 2606 / 6761 reserved or local-only). */
const RESERVED_SUFFIXES = [".localhost", ".test", ".invalid", ".example", ".local", ".internal"];

/** Characters a page path may contain. Percent escapes stay; "%2f" and "%5c" are refused below. */
const PATH = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/;

/**
 * The site URL, or undefined when `site` is not set or is not a usable production URL. The result
 * has no query or fragment and a path that ends in "/", so a page path can be appended to it.
 */
export function parseSiteUrl(site: string | URL | null | undefined): URL | undefined {
  if (site === undefined || site === null || site === "") return undefined;
  let url: URL;
  try {
    url = new URL(String(site));
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return undefined;
  if (url.username || url.password) return undefined;
  if (!host.includes(".") || host.endsWith(".")) return undefined;
  if (host.startsWith("[") || /^[\d.]+$/.test(host)) return undefined; // an IP address
  if (host === "localhost" || RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return undefined;
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

/**
 * A page's route path in the form the build emits it: it starts with "/" and ends with "/" (the
 * site builds one folder per page). Undefined for anything that is not a plain local path.
 */
export function pagePath(pathname: string | null | undefined): string | undefined {
  if (typeof pathname !== "string" || !PATH.test(pathname) || pathname.startsWith("//")) {
    return undefined;
  }
  if (/%2f|%5c/i.test(pathname)) return undefined;
  const segments = pathname.split("/").slice(1);
  if (segments.some((segment) => segment === "." || segment === "..")) return undefined;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function join(base: URL, path: string): string | undefined {
  // "./" keeps a first segment such as "a:b" from being read as a URL scheme.
  const url = new URL(`./${path.slice(1)}`, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return undefined;
  return url.href;
}

/** The absolute URL of a page path under the site, or undefined if either is not usable. */
export function absoluteUrl(
  site: string | URL | null | undefined,
  pathname: string | null | undefined,
): string | undefined {
  const base = parseSiteUrl(site);
  const path = pagePath(pathname);
  return base && path ? join(base, path) : undefined;
}

/** The absolute URL of a file under the site (no trailing slash is added), or undefined. */
export function assetUrl(
  site: string | URL | null | undefined,
  path: string | null | undefined,
): string | undefined {
  const base = parseSiteUrl(site);
  if (!base || typeof path !== "string" || !PATH.test(path) || path.startsWith("//")) {
    return undefined;
  }
  if (/%2f|%5c/i.test(path) || path.endsWith("/")) return undefined;
  if (path.split("/").some((segment) => segment === "." || segment === "..")) return undefined;
  return join(base, path);
}
