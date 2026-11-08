# 0002 — Browser testing

| | |
|---|---|
| Status | Proposed (this record is part of the browser QA pull request and is accepted when that pull request is approved and merged) |
| Date | 2026-11-08 |
| Decides | How the built site is tested in a real browser, and how that test run is wired into CI |
| Source requirements | `OBSCURA_MASTER_BRIEF.md` (§7.6, §11.1, §11.3), `CLAUDE.md` (§3, §7, §8) |
| Builds on | [0001 — Website stack](0001-site-stack.md), [`docs/quality-guard.md`](../quality-guard.md) |
| Supersedes | Nothing |

## 1. Context

`npm run verify` already checks the site without a browser: unit tests, `astro check`, and `npm run check:build`, which reads the built HTML. That guard states what it cannot prove (`docs/quality-guard.md`, "What it does not prove"): it never runs the page, so it cannot see a broken menu, a script error, a layout that scrolls sideways on a phone, a hydrated component that behaves differently from its server-rendered HTML, or `prefers-reduced-motion` handling.

The next phase adds a leadership demo and a visual identity. Both change layout, styling and interaction across every page. Before that work starts, the project needs a safety net that runs the real pages in a real browser, at desktop and phone sizes, on both builds the project can produce (the normal prototype build and the opt-in demo build described in `fixtures/demo/README.md`).

Constraints that apply:

- `CLAUDE.md` §3 asks for a justification for any tool outside the approved stack. Nothing new may enter the production runtime.
- `CLAUDE.md` §8 and the Master Brief §11.3 set a JavaScript budget for visitors. Test tooling must not add to what visitors download.
- The demo build must stay local-only and must never become a deployment artifact (decision D1, and [`src/lib/demoMode.ts`](../../src/lib/demoMode.ts)).

## 2. Options considered

| Option | Summary | Fit | Main cost |
|---|---|---|---|
| **A. Playwright Test** | Test runner, browser control and assertions in one package. Runs Chromium, Firefox and WebKit. | Tests the built output over HTTP. Device emulation (phone viewport, touch), `prefers-reduced-motion` emulation, and a JavaScript-off context are built in. Plays well with axe. | A browser download (about 120 MB for Chromium) on a developer machine and on each CI run. |
| **B. Cypress** | Browser test runner with its own app. | Mature. | Heavier runner. Weaker multi-context support (for example JavaScript off, several viewports in one run). Chromium-family focus. |
| **C. Vitest browser mode** | Run Vitest tests inside a browser. | Reuses the existing runner. | Aimed at component tests, not whole built pages; the browser providers it uses are Playwright or WebdriverIO anyway. |
| **D. jsdom or happy-dom in Vitest** | Simulated DOM, no layout or CSS engine. | No download. | Cannot show layout, focus rendering, media queries, hydration timing or contrast. Gives false confidence for exactly the things this record exists to catch. |
| **E. Manual checking only** | A person opens the site. | No tooling. | Does not scale to dozens of pages, two viewports and two builds, and does not run on every change. |

## 3. Decision

**Use Playwright Test (`@playwright/test`), as a development dependency only.**

### 3.1 What runs, and against what

- The tests read the **built** output, never the development server: `npm run build` produces `dist/` and `npm run demo:build` produces `dist-demo/`. The tests never build anything.
- A small static server for the tests ([`tests/e2e/support/serve.mjs`](../../tests/e2e/support/serve.mjs), no dependencies) serves each folder on its own loopback port (4331 for `dist/`, 4332 for `dist-demo/`). It serves files only, redirects a folder address to its trailing slash, answers a missing file with the build's own `404.html` and status 404, and cannot read outside the folder.
- Four Playwright projects cover both builds at both sizes: `prototype-desktop`, `prototype-mobile`, `demo-desktop` and `demo-mobile`. Desktop is Chromium at 1280 × 800. Phone is the Pixel 7 device profile (a narrow viewport, touch, mobile user agent).
- The list of pages is **read from the built folder**, so a new page is covered automatically and a missing page cannot be forgotten. Per-page tests cover every built page; flows (navigation, menu, keyboard, motion) cover representative routes.

### 3.2 What is checked

- **Page health:** correct status (the 404 page answers 404), `lang`, exactly one `main` and one `h1`, a non-empty title, the prototype `noindex` policy, no canonical URL, no sideways scrolling, and the demo markers (present on every demo page, absent on every normal page).
- **Browser problems:** every test fails on a console error, an uncaught exception, a failed request, or any request to another origin. The site makes no third-party requests, so an external request is a regression.
- **Navigation:** the six primary links, the brand link, the hero's Explore links, the 404 page, the skip link, visible keyboard focus, the phone's full-screen menu (opens, locks the page behind it, closes with Escape and returns focus), and the header with JavaScript turned off.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the hero canvas does not animate and no pause control is offered; without it the canvas drifts and the pause control works.
- **Crawler files:** `robots.txt` disallows everything and no sitemap exists.
- **Accessibility:** see [0003](0003-accessibility-automation.md).
- **Demo safeguards:** see [0004](0004-demo-build-testing.md).

### 3.3 Where it runs

- Locally: `npm run build && npm run demo:build && npm run test:e2e`.
- In CI: a separate `browser-qa` job in `.github/workflows/ci.yml`, so a browser problem is visible on its own and the existing `verify` job is unchanged. It is not part of `npm run verify`, because installing a browser is too heavy for the everyday gate.
- Two workers, one retry in CI, traces kept on failure. The HTML report is uploaded only when the job fails, and contains no build output.

## 4. Consequences

- **Positive:** layout, hydration, focus, the menu and motion preferences are now tested on the real pages. A change to the design system or a page fails a test, not a visitor. The coverage grows with the site.
- **Production is untouched:** Playwright and axe are `devDependencies`. They are not imported by `src/`, not in the build output, and add nothing to a visitor's first load. Installing them on Vercel adds install time only; Playwright does not download a browser when the package is installed.
- **Cost:** a Chromium download (about 120 MB, cached by Playwright), roughly a minute of CI time for the install, and a few minutes for the run. Tests take longer on a small machine, so the run uses two workers.
- **One browser engine for now.** Only Chromium is installed and tested. WebKit and Firefox differ in focus handling and in `<details>` behaviour; adding them is a configuration change (`projects`) plus their browser downloads. Revisit before launch.
- **The test server is not the production host.** It imitates the behaviour that matters (folder redirects, a real 404 status) but not Vercel's headers, compression or caching. Those stay in the launch checklist.
- **Astro's own preview was not used.** Astro 7 allows one `astro preview` per project directory, so two builds could not be served side by side, and previewing the demo build would have needed the CI override described in [0004](0004-demo-build-testing.md). Serving the output folders directly avoids both and keeps the demo build from ever being started inside CI.
- **Performance is still not measured here.** Core Web Vitals need a real device and network profile on the deployed site (`docs/quality-guard.md`). This record adds correctness checks, not a performance budget.

## 5. Revisit when

- The visual identity lands: add visual regression checks if the club wants them, with a decision on where reference images live (they must not be committed to the public repository without review).
- The site is deployed: run the same specs against the preview URL, once the preview is access-controlled.
- A page needs a browser feature that differs by engine: add Firefox and WebKit projects.
