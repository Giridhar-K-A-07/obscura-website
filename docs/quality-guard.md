# Build quality guard

`npm run check:build` (`scripts/check-build.mjs`) inspects the **built site in `dist/`** and fails if a launch-quality constraint that can be decided from static output regresses. It runs after `npm run build`, in `npm run verify` and in CI. It needs no browser and adds no dependency.

It is a guard, not a measurement. It checks what the files say, not how a page performs for a visitor.

## What it enforces automatically

For every built `.html` page (the route is named in each message):

| Area | Rule |
|---|---|
| Document | `<html lang="en">` (Master Brief §11.1); a viewport meta tag |
| Title | exactly one `<title>`, not empty |
| Headings | exactly one `<h1>`, not empty (§11.1: one `h1` per page). Tags inside comments, `<script>` and `<style>` are not counted |
| Landmarks | exactly one `<main>` |
| Identifiers | no duplicate `id` on a page |
| Images | every `<img>` has an `alt` attribute (empty is allowed for decorative images) |
| Description | at most one description meta tag, not empty |
| Canonical | at most one; when present it is an absolute `https` URL on a public host (not localhost, an IP address, or a reserved/local name), with no credentials, query or fragment, and its path is the page's own address |
| Open Graph / Twitter | no tag repeated or empty; `og:title` and `og:type` present if any `og:` tag is; `twitter:card` present and `summary` or `summary_large_image` if any `twitter:` tag is; `og:title`, `twitter:title` equal the `<title>`; `og:description` equals the description; `og:url` and `twitter:url` equal the canonical; `og:image` / `twitter:image` are absolute `https` public URLs with an `…:alt` tag |
| Prototype policy | while `PROTOTYPE` is `true` in `src/lib/siteMode.ts`: every page has exactly one `<meta name="robots" content="noindex, nofollow">`; `robots.txt` exists, disallows everything and has no `Allow` or `Sitemap` line; no `sitemap*.xml` exists. In launch mode a page may be indexable, a robots tag must still be a `noindex` tag, and every sitemap URL must be a public `https` URL of a built page |
| First-party URLs | every local `href`, `src`, `srcset`, `poster`, form `action` and hydrated-island URL resolves to a file in `dist/` (relative URLs are resolved against the page and cannot leave `dist/`); a `#fragment` must match an `id` on the page it names; `javascript:` URLs are refused. External, `mailto:` and `tel:` URLs are not followed |

### JavaScript budget

**100,000 bytes of gzip (level 9) of first-load JavaScript per page, excluding the hero.** (The brief says 100 KB compressed; 100,000 bytes is the stricter reading. Servers that use Brotli will send less.)

- *First load* means the scripts a page loads when it opens: `<script src>`, `modulepreload` links, the component, renderer and before-hydration URLs of every `<astro-island>`, every inline script, and every module those import statically. Dynamic `import()` is loaded later and is not counted. Each file is compressed separately and the sizes are added.
- *Hero* is the Interactive Data Canvas island: a hydrated component whose built file name starts with a name in `HERO_COMPONENTS` (`HeroCanvas`). Its component, its renderer (`@astrojs/react` client) and what they import are reported as hero JavaScript and are **not budgeted** (the brief sets no hero ceiling). Astro's own hydration-runtime inline scripts count as hero only on a page whose islands are all the hero.
- A file shared between the hero and any non-hero script counts as non-hero. There is no other exception: a new hydrated component, or any extra script, is counted against the budget.
- On the current build the hero is a separate set of assets (about 73 KB gzip, reported but not limited), and every page's non-hero JavaScript is a few hundred bytes.

## What it does not prove (left for the deployed site)

These need a real browser on a deployed site, on a mid-range phone and a 4G profile (Master Brief §11.3). They are launch-checklist items, not automated here:

- **LCP ≤ 2.5 s**, **CLS ≤ 0.1**, **INP ≤ 200 ms**. Static output cannot show any of them.
- Real-device and slow-network behaviour, caching and compression headers actually served, image and font delivery (there are none yet).
- WCAG 2.2 AA conformance. The guard checks a few structural facts above; it is **not an accessibility audit**. It does not check colour contrast, focus visibility, keyboard operation, heading order, link and control names, reduced-motion behaviour, or screen-reader output. Those need an audit with a tool such as axe plus manual keyboard and screen-reader testing on the deployed site.
- Production URL, canonical/sitemap activation, `.ics` Content-Type, social-preview rendering, and calendar import.

## Scope of the CI run

CI builds the repository as committed, which has no club content. The pages it builds are the shell pages, so content-dependent templates (an event page, an article, a term page) are not in that build. Run `npm run build && npm run check:build` locally with temporary fixture content to exercise them; the guard checks whatever is in `dist/`.
