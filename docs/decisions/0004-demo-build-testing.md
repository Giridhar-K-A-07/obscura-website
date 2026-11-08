# 0004 — Testing the demo build

| | |
|---|---|
| Status | Proposed (accepted when the browser QA pull request is approved and merged) |
| Date | 2026-11-08 |
| Decides | How the opt-in demo build (synthetic data, local only) is tested in a browser and in CI without weakening the rules that keep it out of deployments |
| Source requirements | Roadmap decision D1 (demo mode strictly local-only, an unmistakable DEMO banner on every page, never in normal builds or deployments); `OBSCURA_MASTER_BRIEF.md` §13 |
| Builds on | [0002 — Browser testing](0002-browser-testing.md), `src/lib/demoMode.ts`, `fixtures/demo/README.md`, `docs/quality-guard.md` |
| Supersedes | Nothing |

## 1. Context

The demo build (`npm run demo:build`) writes a site of **synthetic** fixtures to `dist-demo/`, for design review. It exists so leadership and designers can see every page with plenty of plausible content before any verified content exists. Its safety rests on layers that already exist:

- It reads `fixtures/demo/` instead of `content/` and `public/`, and writes only to `dist-demo/` (git-ignored, never `dist/`).
- Every demo page carries a DEMO banner, a corner badge, a `DEMO — ` title prefix and `<meta name="obscura-build" content="demo">`. Every demo calendar file says DEMO in a property, its summary and its description.
- A demo build is always a prototype: `noindex`, closed `robots.txt`, no sitemap.
- The Astro config **refuses** to run a demo build when it sees a hosted build environment (CI, Vercel, Netlify, Cloudflare Pages, GitHub Actions, GitLab CI, Render, Railway). The only way round it is the explicit `OBSCURA_DEMO_ALLOW_CI=1` override.
- `check:build` takes the expected mode as an explicit `--demo` flag and checks it against the folder, so a demo build cannot pass as a normal one, or the reverse.

Until now, no automated test opened a demo page in a browser, and CI never built the demo. The demo's labelling, its fixed clock and its calendar files are things only a browser run can fully show. At the same time, CI is the place where the demo must be hardest to leak, so testing it there needs care.

## 2. Options considered

| Option | Summary | Verdict |
|---|---|---|
| **A. Never build the demo in CI** | Test only the normal build in the browser. | Safest, but leaves the demo untested and lets it rot unnoticed until someone opens it for a review. Rejected. |
| **B. Build and preview the demo in CI with a job-wide override** | Set `OBSCURA_DEMO_ALLOW_CI=1` for the whole job (or workflow) and run `astro preview` on the demo. | Simple, but the override would then apply to every step, including any step added later, and to a preview server that runs Astro (and its config) in CI. Rejected. |
| **C. Build the demo in CI with the override on that one step only, and test the output folder as static files** | `npm run demo:build` runs with the override as a step-level variable; the browser tests read `dist-demo/` through the file server in [0002](0002-browser-testing.md); nothing else sees the override. | Keeps the demo tested and the override as narrow as it can be. **Chosen.** |
| **D. Commit a prebuilt demo or screenshots as test fixtures** | Check build output or images into the repository. | Rejected. It would publish synthetic output in a public repository, go stale, and invite its reuse as content. |

## 3. Decision

**Option C.** The demo build is built and tested in CI under these rules.

1. **The override is scoped to one step.** In `.github/workflows/ci.yml` the `browser-qa` job runs `npm run demo:build` with `OBSCURA_DEMO_ALLOW_CI: "1"` set as that step's own `env`. It is not set at the workflow level, at the job level or on any other step. The Astro config's refusal is not changed, bypassed or made conditional on anything else.
2. **The demo is never served by Astro in CI.** The browser tests serve the finished `dist-demo/` folder with a static file server. No process in CI runs Astro in demo mode other than the build step in rule 1.
3. **The demo output never leaves the runner as a deployable thing.** No step uploads `dist-demo/`, `dist/` or any build output as an artifact, and no step deploys anything. The only artifact CI may upload is the Playwright report, and only when the job fails.
4. **The existing `verify` job is unchanged.** It builds and checks only the normal build, exactly as before, and its workflow sets no override. (The integration test inside `npm test` sets the override on its own child process for its one intentional demo build; that is the test's environment, not the workflow's.)
5. **The refusal stays tested without the override.** `tests/integration/demoBuild.test.ts` still runs its refusal cases without the override and proves that hosted-environment variables stop a demo build. `tests/unit/ciWorkflow.test.ts` (new) reads the workflow file and fails if the override appears anywhere other than on the one demo build step, if any step uploads build output, if a deploy action appears, or if the `verify` job gains a demo step.
6. **The browser tests assert the labelling in both directions.** On the demo build, every built page must carry exactly one banner, one badge, the build marker and the `DEMO — ` title; the banner cannot be dismissed; the badge stays on screen while scrolling; event status follows the fixed demo clock; every calendar file offered says DEMO. On the normal build, no page carries any of those and no synthetic text appears on any page, no fixture URL is served, and the site shows the prototype notice instead.

## 4. Consequences

- **Positive:** the demo build is built, checked by `check:build --demo`, and exercised in a real browser on every pull request, so a change that breaks it is found immediately. The normal build is checked for demo leakage in a browser as well as in files.
- **The override now exists in CI.** That is a real change in risk and the reason for rule 5: the workflow test is the guard on the guard. A future edit that widens the override fails that test rather than going unnoticed. A reviewer should still read any change to `ci.yml` that touches `OBSCURA_DEMO_ALLOW_CI`.
- **A deployment still cannot contain the demo.** Vercel builds with its own build command and refuses a demo build by its environment. `dist-demo/` is not the output directory Vercel serves, is git-ignored, and is not uploaded by CI.
- **The demo is built twice in CI** (once in the `browser-qa` job, and once by the integration test inside `npm test` in the `verify` job, which runs under the same refusal rules and removes the override for the refusal cases). That costs time, not safety.
- **Failure reports may show demo pages.** A Playwright report from a failed run can include screenshots or traces of demo pages. Those pages are synthetic and labelled DEMO on every screen, and the report is kept for a short time and is not a site artifact.

## 5. Revisit when

- The visual direction is chosen and the demo is used for leadership review: decide whether a shareable, access-controlled preview is wanted (decision D5). That is a separate decision and needs authentication before anything is shared.
- A hosting provider changes the environment variables it sets: update `HOSTED_ENV` in `src/lib/demoMode.ts` and the table in its unit test, not this record.
