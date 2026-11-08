# 0003 — Accessibility automation

| | |
|---|---|
| Status | Proposed (accepted when the browser QA pull request is approved and merged) |
| Date | 2026-11-08 |
| Decides | How WCAG 2.2 AA is checked automatically on every built page, and what that check does and does not prove |
| Source requirements | `OBSCURA_MASTER_BRIEF.md` §11.1 (WCAG 2.2 AA), `CLAUDE.md` §7 |
| Builds on | [0002 — Browser testing](0002-browser-testing.md), `docs/quality-guard.md` |
| Supersedes | Nothing |

## 1. Context

The Master Brief (§11.1) targets WCAG 2.2 AA. The build guard (`npm run check:build`) checks a few structural facts from the HTML (language, one `h1`, one `main`, image `alt`, duplicate ids) and says plainly that it is not an accessibility audit: it cannot see colour contrast, focus visibility, accessible names computed by the browser, ARIA validity in context, or what hydrated components do.

Those checks need a rendered page. The leadership demo and the visual identity work will restyle every page, so the cost of a contrast or focus regression is highest exactly when the design changes most.

## 2. Options considered

| Option | Summary | Fit | Main cost |
|---|---|---|---|
| **A. axe-core through `@axe-core/playwright`** | Run the axe rules inside the same Playwright page that the other browser tests use. | Maintained by Deque, the de-facto standard engine. Understands the rendered DOM and computed styles. Tags map to WCAG levels, so the target is stated in one line. Results carry the rule, the element and a fix link. | Automated rules find only a part of real problems (commonly cited as under half). |
| **B. Pa11y or Lighthouse CI** | Separate command-line audit tools. | Pa11y uses axe or HTML CodeSniffer; Lighthouse includes axe rules. | Another runner, another browser launch, separate reporting. No gain over A inside an existing Playwright run. |
| **C. ESLint accessibility plugins** | Static checks on source (`eslint-plugin-jsx-a11y`, an Astro equivalent). | Cheap and early. | Sees templates, not rendered pages: no contrast, no computed names, no component composition. Complements A, does not replace it. |
| **D. Manual audits only** | Keyboard and screen-reader sessions by a person. | Finds what tools cannot. | Not repeatable on every change. |

## 3. Decision

**Option A: axe-core through `@axe-core/playwright`, as a development dependency, on every built page.** Manual audits (D) remain required and are not replaced.

- **Scope.** One axe scan for every built page of both builds (the 404 page included), at both the desktop and the phone viewport: 11 pages × 2 viewports on the normal build, and 46 pages × 2 viewports on the demo build. The open phone menu, which is hidden in the page scans, is scanned on its own on each build. The page list comes from the built folder, so a new page is scanned without editing a test.
- **Standard.** The rule tags are `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`: the WCAG 2.2 AA target of the Master Brief, which includes levels A and AA of 2.0 and 2.1. Best-practice rules and AAA rules are not part of the gate.
- **Hydrated DOM.** The scan waits until the hero island has hydrated, so it checks the DOM a visitor ends up with, not only the server-rendered HTML.
- **Zero violations.** A violation fails the test. There is no baseline file and no rule is disabled. If a future change makes a violation unavoidable, the test names the rule and element and the right response is to fix the page or to record a narrow, reasoned exemption in the test with a comment and a link to the issue.
- **Clear reports.** A failure prints, for each violation, the rule id, its impact, the help text, the help URL, and up to five element selectors with axe's failure summary. The full JSON is attached to the test result.
- **Beyond axe, the browser tests also check** what automated rules cannot easily decide: the skip link is the first keyboard stop and moves focus into `main`; each of the first eight Tab stops on the home page has a visible focus outline; the phone menu locks the page behind it and returns focus on Escape; the header works with JavaScript off; reduced motion removes animation and the pause control appears otherwise (see [0002](0002-browser-testing.md)).

## 4. Consequences

- **Positive:** a contrast, name, label, landmark or ARIA regression fails a pull request with an actionable message, on every page, at both sizes, before and during the visual work.
- **Not a conformance claim.** A clean axe run does not mean the site conforms to WCAG 2.2 AA. Automated rules cover only part of the criteria. Colour contrast of text over images, focus order that makes sense, meaningful link text, reading order, reflow at 400% zoom, target size in context, error handling in forms and screen-reader output still need manual checks on the deployed site. `docs/quality-guard.md` keeps that list.
- **Provisional colours.** The site's colours and fonts are provisional (`CLAUDE.md` §6). Contrast passes today for the current tokens; a new palette is checked by this suite the moment it lands.
- **Runtime cost: none.** axe-core runs in the test browser only. It is not in the build output and adds nothing to a visitor's JavaScript.
- **Dependency risk.** axe rules change between releases and can add new findings on upgrade. Upgrading `@axe-core/playwright` is a deliberate change that may need page fixes in the same pull request.

## 5. Revisit when

- Visual regression or screenshot comparison is wanted (separate decision, see [0002](0002-browser-testing.md)).
- Forms (RSVP) exist: add scans of their error and success states, which a static page scan cannot reach.
- Real content arrives: re-run against content-heavy pages (long articles, tables, images) and add manual audits of those templates.
