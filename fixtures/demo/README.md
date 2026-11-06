# Demo fixtures

Synthetic data for the local demo build (`npm run demo`, `npm run demo:build`). It lets every page
be previewed, and the design reviewed, before real club content exists (Master Brief §12.4, §13.2).

**None of this is real.** Every record says so in its `source`, every person is "Test Person NN" or
"Test Faculty NN", the dates are in the 2090s, and every page of a demo build carries a DEMO banner.

Rules:

- It is read only when `OBSCURA_DEMO=1` (set by `scripts/demo.mjs`). A normal build, CI and any
  deployment read `content/` and `public/` and never this folder.
- A demo build writes to `dist-demo/`, which is git-ignored and must never be deployed or shared as
  the real site. It refuses to run in CI or on a build host (Vercel, Netlify, Cloudflare Pages, GitHub
  Actions, Render, Railway), unless `OBSCURA_DEMO_ALLOW_CI=1` is set on purpose for a check that
  deploys nothing.
- Switching between demo and normal mode needs a restart of the dev server: stop it and start it
  again with the other command, because the mode is read once, when the server starts.
- Calendar files in a demo build carry an `X-OBSCURA-BUILD:DEMO` property and `[DEMO]` in their
  summary and description; `check:build` fails a normal build that holds either.
- Never copy a file from here into `content/`. A test fails if anything in `content/` carries a
  fixture trace (a fixture id, a `Test Person NN` name, a demo title or venue, an `example.org`
  contact, a date in the 2090s), even if the `source` line was edited.
- Use only obviously synthetic values: `example.org` links, `demo@example.org`, grey placeholder
  images, no real names, no real photographs, no real club facts.
- The demo clock is fixed at 2099-06-15 10:00 (IST), so events are upcoming, happening now or past
  in the same way on every build.
