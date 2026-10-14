import { APPROVED_ASSETS, DESCRIPTION_OVERRIDES } from "./launchMetadata";
import { absoluteUrl, assetUrl, pagePath } from "./siteUrl";

/*
  The one place page metadata is decided: the title, the description, the canonical link, Open
  Graph and Twitter tags, and the favicon link. BaseLayout renders what this returns (through
  PageMeta.astro), so no page repeats any of it.

  Safe by default:
  - Absolute URLs (canonical, og:url, twitter:url, og:image) are produced only when the build has a
    usable production `site` (see siteUrl.ts). With none, they are left out, never guessed.
  - A page that stays out of indexes by itself (404, the placeholder pages) gets no canonical or
    page URL.
  - There is no image and no favicon until the club approves one: they come only from
    APPROVED_ASSETS (launchMetadata.ts), which is empty.
  - A description that still carries a `[[NEEDED: ...]]` marker is never emitted.
  - Values are returned as plain text. Astro escapes them where they are rendered, so a title from
    content cannot break out of an attribute.
  This module does not decide whether a page is indexed: that stays with siteMode.ts (the robots
  meta tag in BaseLayout).
*/

/** A site path to an approved asset, such as "/brand/favicon.svg". */
const ASSET_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/]+$/;
const FAVICON_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
};

export interface ApprovedAssets {
  /** A favicon the club has approved, as a site path. */
  favicon?: string;
  /** A social-sharing image the club has approved: a site path and its alternative text. */
  ogImage?: { path: string; alt: string };
}

export interface MetadataInput {
  title: string;
  /** The page's own description. */
  description?: string;
  /** The page's route path, such as Astro.url.pathname. */
  pathname?: string;
  /** The configured production site (Astro.site). Unset means no absolute URLs. */
  site?: string | URL | null;
  /** The page keeps itself out of indexes in every mode, so it has no canonical URL. */
  noindex?: boolean;
  assets?: ApprovedAssets;
  /** Launch-time descriptions by page path; see launchMetadata.ts. */
  descriptionOverrides?: Readonly<Record<string, string>>;
}

export interface MetaTag {
  /** `name` for most tags, `property` for Open Graph. */
  attribute: "name" | "property";
  key: string;
  content: string;
}

export interface PageMetadata {
  title: string;
  description?: string;
  canonical?: string;
  favicon?: { href: string; type: string };
  tags: MetaTag[];
}

const MARKER = /\[\[\s*NEEDED/i;

/** Plain text on one line, or undefined when empty or carrying an unverified marker. */
export function cleanText(text: string | null | undefined): string | undefined {
  if (typeof text !== "string") return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean && !MARKER.test(clean) ? clean : undefined;
}

/**
 * The description for a page: a launch-time override for its path when there is one, otherwise the
 * description the page gave. Neither is rewritten.
 */
export function resolveDescription(
  pathname: string | undefined,
  given: string | undefined,
  overrides: Readonly<Record<string, string>> = DESCRIPTION_OVERRIDES,
): string | undefined {
  const path = pagePath(pathname);
  if (path) {
    for (const [key, value] of Object.entries(overrides)) {
      if (pagePath(key) === path) {
        const override = cleanText(value);
        if (override) return override;
      }
    }
  }
  return cleanText(given);
}

function favicon(assets: ApprovedAssets): PageMetadata["favicon"] {
  const href = assets.favicon;
  if (!href || !ASSET_PATH.test(href)) return undefined;
  const type = FAVICON_TYPES[href.split(".").pop()?.toLowerCase() ?? ""];
  return type ? { href, type } : undefined;
}

export function buildMetadata(input: MetadataInput): PageMetadata {
  const assets = input.assets ?? APPROVED_ASSETS;
  const title = cleanText(input.title) ?? "OBSCURA";
  const description = resolveDescription(
    input.pathname,
    input.description,
    input.descriptionOverrides,
  );
  const url = input.noindex ? undefined : absoluteUrl(input.site, input.pathname);

  // An image needs an absolute URL and alternative text; without either it is left out.
  const imageAlt = cleanText(assets.ogImage?.alt);
  const imageUrl =
    assets.ogImage && imageAlt && ASSET_PATH.test(assets.ogImage.path)
      ? assetUrl(input.site, assets.ogImage.path)
      : undefined;

  const tags: MetaTag[] = [
    { attribute: "property", key: "og:title", content: title },
    ...(description
      ? [{ attribute: "property", key: "og:description", content: description }]
      : []),
    { attribute: "property", key: "og:type", content: "website" },
    ...(url ? [{ attribute: "property", key: "og:url", content: url }] : []),
    ...(imageUrl
      ? [
          { attribute: "property", key: "og:image", content: imageUrl },
          { attribute: "property", key: "og:image:alt", content: imageAlt! },
        ]
      : []),
    {
      attribute: "name",
      key: "twitter:card",
      content: imageUrl ? "summary_large_image" : "summary",
    },
    { attribute: "name", key: "twitter:title", content: title },
    ...(description
      ? [{ attribute: "name", key: "twitter:description", content: description }]
      : []),
    ...(url ? [{ attribute: "name", key: "twitter:url", content: url }] : []),
    ...(imageUrl
      ? [
          { attribute: "name", key: "twitter:image", content: imageUrl },
          { attribute: "name", key: "twitter:image:alt", content: imageAlt! },
        ]
      : []),
  ] as MetaTag[];

  return { title, description, canonical: url, favicon: favicon(assets), tags };
}
