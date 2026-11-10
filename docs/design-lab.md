# Design lab: homepage design exploration

| | |
|---|---|
| Status | **Exploration. No concept is selected or approved.** Nothing here is the final homepage. |
| Purpose | Let the project owner compare three complete homepage concepts in a browser before choosing a visual direction (gate G1). |
| Governing documents | [`OBSCURA_MASTER_BRIEF.md`](../OBSCURA_MASTER_BRIEF.md), [`docs/design-direction.md`](design-direction.md) |
| Code | [`src/design-lab/`](../src/design-lab/) |

Every colour and font in the three concepts is **provisional**. The logo is the temporary typographic placeholder. Nothing is an official OBSCURA brand decision.

## Run it

The lab exists only in the local **demo build**, which fills every section with synthetic fixtures (see [ADR 0004](decisions/0004-demo-build-testing.md)).

```bash
npm run demo
```

Then open the address Astro prints, followed by `/design-lab/`:

- `/design-lab/` is the index of the three concepts.
- `/design-lab/a/` is Concept A, Editorial chamber.
- `/design-lab/b/` is Concept B, Instrument.
- `/design-lab/c/` is Concept C, Projection.

A note under the header names the concept on screen. The **A, B, C, All** switcher fixed at the bottom right of every concept page moves between them. The real homepage at `/` is unchanged.

To build and serve it as static files instead:

```bash
npm run demo:build
npm run demo:preview
```

## The concepts

All three keep the Master Brief's section order (Hero, Next event, What OBSCURA is, Legacy teaser, Recent, Built by members, Start learning, Footer), hide a section that has no content, use the same navigation (Legacy · Events · Achievements · Projects · Learn · Blog), and use the single pale accent A1 (`#BCCDFF`). No concept uses a second accent.

| | A. Editorial chamber | B. Instrument | C. Projection |
|---|---|---|---|
| Idea | A publication read in a dark room | A creative-technology laboratory | The camera obscura itself |
| Foundation | F1 navy-black | F2 neutral charcoal | F1 navy-black |
| Type pairing | T1: serif display | T2: sans display | T3: serif headings, sans interface |
| Hero | The production network canvas, framed as a captioned figure | A viewfinder: a dim copy of the network and a sharp circular focus window with a reticle | A round chamber with a pinhole of light, a cone of projected light and the network resolving inside |
| Signature detail | Hairline horizons with an aperture mark between sections; the date as a large typographic object | Registration corners, a visible 12-column grid, a ruler, specification tables | A ray of light along the left of the page, a dial for the date, steps on a line |
| Hero JavaScript | The existing island, unchanged | `HeroCanvasInstrument` | `HeroCanvasProjection` |

Foundations, type pairings and accents are defined in [`design-direction.md`](design-direction.md) sections 3 and 4. The type uses **system fonts only** (no webfont is chosen or loaded), so the rendering depends on the fonts installed on the machine. A concept's typography should be re-judged once real fonts are chosen.

## How it stays out of the real site

1. **Routes.** The pages are not under `src/pages/`. `astro.config.mjs` registers them with `injectRoute` only when `OBSCURA_DEMO=1` (`designLab()` integration). A normal build never sees the pages, their scripts or their styles.
2. **Styles.** `src/styles/global.css` has `@source not "../design-lab"`, so Tailwind does not scan the lab and adds no utility class to the real stylesheet.
3. **Safeguards.** The lab pages use `BaseLayout`, so the DEMO banner, the DEMO badge, the DEMO title prefix, `noindex` and the prototype notice are unchanged. The lab chrome (the note and the switcher) uses its own fixed, neutral colours and never imitates a concept.

Tests that pin this: `tests/unit/designLab.test.ts` (routes only in a demo build, section order, accent palette, hero naming), `tests/e2e/demo.designlab.spec.ts` (behaviour in a browser) and `tests/e2e/prototype.safeguards.spec.ts` (no lab route in the normal build). The normal `dist/` output was also compared with a build of `main`: the file lists are the same and the only difference in the HTML is Astro's random island identifier.

## Measure a concept

The build guard measures each page's first-load JavaScript, split into the hero and everything else:

```bash
npm run demo:build
node -e "import('./scripts/check-build.mjs').then(m=>{const r=m.checkBuild('dist-demo',{prototype:true,demo:true});for(const p of r.pages.filter(p=>p.route.startsWith('/design-lab/')))console.log(p.route,p.js)})"
```

The **hero** figure is reported and not limited today. The 100 KB gzip hero ceiling in [`design-direction.md`](design-direction.md) section 10.1 is a proposal and is not enforced. The **non-hero** figure is held to the existing 100,000-byte budget, unchanged.

## Review evidence

Screenshots and recordings are **not committed** to this public repository ([`design-direction.md`](design-direction.md) section 12.4). They are kept locally.

## Removing the lab

When a direction is chosen, delete `src/design-lab/`, the `designLab()` integration in `astro.config.mjs`, the `@source not` line in `src/styles/global.css`, this document, `tests/unit/designLab.test.ts`, `tests/e2e/demo.designlab.spec.ts` and the design-exploration test in `tests/e2e/prototype.safeguards.spec.ts`. Nothing else depends on them.
