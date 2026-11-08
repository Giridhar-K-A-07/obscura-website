# obscura-website
Official website for OBSCURA

## Status

Technical foundation only. No pages and no club content exist yet. Scope and rules are in
[`OBSCURA_MASTER_BRIEF.md`](OBSCURA_MASTER_BRIEF.md); the stack decision is in
[`docs/decisions/0001-site-stack.md`](docs/decisions/0001-site-stack.md).

## Setup

Requires Node 22 (`>=22.12.0 <23`, see `.nvmrc`).

```sh
npm ci
npm run dev      # local dev server
npm run build    # static production build to dist/
npm run verify   # format check, lint, type check, tests, [[NEEDED]] check, build, build guard
```

## Content rules

Content lives in `content/` as YAML (and MDX for long text), validated by Zod schemas in
`src/lib/schemas.ts`. Every record needs a `source` and a `status` (`draft` or `verified`).
Only verified records may be published, and a verified record must not contain a
`[[NEEDED: ...]]` placeholder. See `content/README.md`.

## Local demo (synthetic data)

`npm run demo` starts the site on synthetic fixtures (`fixtures/demo/`) so every page can be
previewed and the design reviewed before real content exists. `npm run demo:build` builds it to
`dist-demo/` and checks it; `npm run demo:preview` serves that build. Every page carries a DEMO
banner, a `DEMO —` title prefix and `noindex`, the clock is fixed in the year 2099, and nothing in it
is real. **The demo is local only:** a normal build, CI and any deployment never read the fixtures,
and the demo build refuses to run in CI or on any common build host (Vercel, Netlify, Cloudflare Pages, GitHub Actions, Render, Railway). **Switching between demo and normal mode needs a restart:** stop the dev server and start it again with the other command (`npm run demo` or `npm run dev`), because the mode is read once, when the server starts. See [`fixtures/demo/README.md`](fixtures/demo/README.md).

## Build guard

`npm run check:build` checks the built `dist/` (page structure, metadata, links, the prototype `noindex`
policy and the first-load JavaScript budget). What it enforces, and what only a deployed-site
measurement can prove (LCP, CLS, INP, accessibility conformance), is in
[`docs/quality-guard.md`](docs/quality-guard.md).

## Browser QA

`npm run test:e2e` opens the **built** site in a real browser (Playwright, Chromium) and checks every
page of both builds at a desktop and a phone size: structure and metadata, navigation and the phone
menu, keyboard focus, reduced motion, the prototype `noindex` policy, no demo content in the normal
build, DEMO labelling in the demo build, and WCAG 2.2 AA with axe. It reads `dist/` and `dist-demo/`
and builds nothing, so build both first. One-time setup downloads the browser (about 120 MB):

```sh
npx playwright install chromium
npm run build
npm run demo:build
npm run test:e2e
```

Playwright and axe are development dependencies only; nothing is added to the site. CI runs this in
its own `browser-qa` job. Why, and how the demo build stays out of deployments, is in
[`docs/decisions/0002-browser-testing.md`](docs/decisions/0002-browser-testing.md),
[`0003`](docs/decisions/0003-accessibility-automation.md) and
[`0004`](docs/decisions/0004-demo-build-testing.md).

## Design system (provisional)

Tokens and primitives live in `src/styles/` (`tokens.css`, `base.css`, `components.css`). All colours
and fonts are provisional until the Design/Brand review. `npm run dev` serves a development-only
preview at `/dev/design-system`; it is not part of the production build.
