# Demo fixtures

Synthetic data for the local demo build (`npm run demo`, `npm run demo:build`). It lets every page
be previewed, and the design reviewed, before real club content exists (Master Brief §12.4, §13.2).

**None of this is real.** Every record says so in its `source`, every person is "Test Person NN" or
"Test Faculty NN", the dates are in the 2090s, and every page of a demo build carries a DEMO banner.

Rules:

- It is read only when `OBSCURA_DEMO=1` (set by `scripts/demo.mjs`). A normal build, CI and any
  deployment read `content/` and `public/` and never this folder.
- A demo build writes to `dist-demo/`, which is git-ignored and must never be deployed or shared as
  the real site. It refuses to run in CI or on Vercel.
- Never copy a file from here into `content/`. A test fails if a record in `content/` has a
  `DEMO fixture` source.
- Use only obviously synthetic values: `example.org` links, `demo@example.org`, grey placeholder
  images, no real names, no real photographs, no real club facts.
- The demo clock is fixed at 2099-06-15 10:00 (IST), so events are upcoming, happening now or past
  in the same way on every build.
