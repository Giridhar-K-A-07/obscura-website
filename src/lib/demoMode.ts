/*
  Demo mode: a LOCAL, opt-in build that fills every page with synthetic fixture data so the design
  can be reviewed before real content exists (Master Brief §12.4, §13.2).

  It is off unless `OBSCURA_DEMO=1` is set, which only `npm run demo*` (scripts/demo.mjs) does.
  When it is on:
  - content comes from `fixtures/demo/` instead of `content/`, and static files from
    `fixtures/demo/public/` instead of `public/` (see content.config.ts and astro.config.mjs);
  - the output goes to `dist-demo/`, never `dist/`, so it cannot be mistaken for the real build;
  - every page carries an unmistakable DEMO banner, a "DEMO —" title prefix and `noindex`, and
    the site behaves as a prototype whatever PROTOTYPE says (siteMode.ts);
  - the clock is fixed at DEMO_NOW, so upcoming, in-progress and past events look the same on
    every build and the screenshots are repeatable;
  - the build refuses to run in CI or on Vercel unless OBSCURA_DEMO_ALLOW_CI=1 is also set.
  Synthetic data is never part of a normal build or deployment.
*/

/** True only for a demo build. The value is read once, when the build starts. */
export const DEMO = process.env.OBSCURA_DEMO === "1";

/**
 * The demo build's "now": a moment far in the future, so no fixture date can be mistaken for a
 * real club date. Fixture events are placed around it.
 */
export const DEMO_NOW = new Date("2099-06-15T10:00:00+05:30");

/** The time the build treats as now: the demo clock in a demo build, the real clock otherwise. */
export const buildNow = (): Date => (DEMO ? DEMO_NOW : new Date());

export const DEMO_PREFIX = "DEMO — ";

/** A page title in a demo build carries the prefix, so no tab can be mistaken for the real site. */
export const demoTitle = (title: string, demo: boolean = DEMO): string =>
  demo && !title.startsWith(DEMO_PREFIX) ? `${DEMO_PREFIX}${title}` : title;

/**
 * Why a demo build must not run here, or null when it may. CI and Vercel never build the demo
 * unless a second variable says so on purpose, for a check that deploys nothing.
 */
export function demoRefusal(env: Record<string, string | undefined>): string | null {
  if (env.OBSCURA_DEMO !== "1") return null;
  const hosted = Boolean(env.CI) || Boolean(env.VERCEL);
  if (hosted && env.OBSCURA_DEMO_ALLOW_CI !== "1") {
    return (
      "OBSCURA_DEMO=1 is set in a CI or Vercel environment. The demo build holds synthetic data " +
      "and must never be built or deployed there. Unset OBSCURA_DEMO, or set " +
      "OBSCURA_DEMO_ALLOW_CI=1 for a check that deploys nothing."
    );
  }
  return null;
}

/** How far the demo clock is from the real one, so a page's script can keep the demo clock. */
export const clockOffsetMs = (now: Date, real: number = Date.now()): number =>
  DEMO ? now.getTime() - real : 0;
