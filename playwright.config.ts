import { defineConfig, devices } from "@playwright/test";
import type { SiteMode } from "./tests/e2e/support/site";

/*
  Browser QA (docs/decisions/0002-browser-testing.md). The tests run against the BUILT site, never
  the dev server: `npm run build` writes dist/ and `npm run demo:build` writes dist-demo/, and
  each is served as plain files by tests/e2e/support/serve.mjs. Nothing here builds or deploys
  anything, and the servers never start Astro, so the demo build is only ever read, not run.

  Four projects: the normal prototype build and the opt-in demo build, each at a desktop and a
  phone viewport. (Astro 7 allows one `astro preview` per project, and a demo preview would need
  the CI override; reading the output folder directly avoids both. Building the demo is the only
  step that needs the override: see .github/workflows/ci.yml and tests/unit/ciWorkflow.test.ts.)
*/
const PROTOTYPE_PORT = 4331;
const DEMO_PORT = 4332;
const HOST = "127.0.0.1";

const projects = (mode: SiteMode, port: number) => {
  const baseURL = `http://${HOST}:${port}`;
  const ignore = mode === "demo" ? /prototype\..*\.spec\.ts$/ : /demo\..*\.spec\.ts$/;
  return [
    {
      name: `${mode}-desktop`,
      testIgnore: ignore,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL },
    },
    {
      name: `${mode}-mobile`,
      testIgnore: ignore,
      use: { ...devices["Pixel 7"], baseURL },
    },
  ];
};

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Two browsers at a time: more than that starves a small CI runner or laptop and causes timeouts.
  workers: 2,
  timeout: 60_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  globalSetup: "./tests/e2e/support/globalSetup.ts",
  use: { trace: "retain-on-failure" },
  projects: [...projects("prototype", PROTOTYPE_PORT), ...projects("demo", DEMO_PORT)],
  webServer: [
    {
      command: `node tests/e2e/support/serve.mjs dist ${PROTOTYPE_PORT}`,
      url: `http://${HOST}:${PROTOTYPE_PORT}/`,
      // Never attach to a server that happens to be running: it could be serving the wrong build.
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `node tests/e2e/support/serve.mjs dist-demo ${DEMO_PORT}`,
      url: `http://${HOST}:${DEMO_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
