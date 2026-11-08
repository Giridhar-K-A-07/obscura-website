import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/*
  The CI workflow is the one place a demo build could be pushed toward a deployment, and the one place
  the demo override (OBSCURA_DEMO_ALLOW_CI) is used. These tests read the workflow file and fail if
  that stops being narrow (docs/decisions/0004-demo-build-testing.md).
*/
interface Step {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  env?: Record<string, unknown>;
  with?: Record<string, unknown>;
}
interface Job {
  env?: Record<string, unknown>;
  steps: Step[];
}
const text = readFileSync(".github/workflows/ci.yml", "utf8");
const workflow = parse(text) as { env?: Record<string, unknown>; jobs: Record<string, Job> };
const steps = Object.entries(workflow.jobs).flatMap(([job, { steps }]) =>
  steps.map((step) => ({ job, step })),
);
const OVERRIDE = "OBSCURA_DEMO_ALLOW_CI";

describe("the CI workflow keeps the demo build local-only", () => {
  it("has the verify job and the browser QA job", () => {
    expect(Object.keys(workflow.jobs)).toEqual(["verify", "browser-qa"]);
  });

  it("sets no demo variable at the workflow or job level", () => {
    for (const env of [workflow.env, ...Object.values(workflow.jobs).map((job) => job.env)]) {
      expect(Object.keys(env ?? {}).filter((name) => name.startsWith("OBSCURA_"))).toEqual([]);
    }
  });

  it("gives the override to exactly one step: the demo build in the browser QA job", () => {
    const withOverride = steps.filter(({ step }) => step.env && OVERRIDE in step.env);
    expect(withOverride).toHaveLength(1);
    const [{ job, step }] = withOverride;
    expect(job).toBe("browser-qa");
    expect(step.run).toBe("npm run demo:build");
    expect(step.env).toEqual({ [OVERRIDE]: "1" });
    // It is not set anywhere else in the file, not even in a run line or a comment-free value.
    const mentions = text.split("\n").filter((line) => line.includes(`${OVERRIDE}: `));
    expect(mentions).toHaveLength(1);
  });

  it("never builds or previews the demo in the verify job", () => {
    for (const { job, step } of steps.filter(({ job }) => job === "verify")) {
      expect(`${step.run ?? ""} ${job}`, step.run).not.toMatch(/demo|OBSCURA_DEMO/);
    }
  });

  it("runs the demo only through the build script, never dev, preview or a direct Astro call", () => {
    for (const { step } of steps) {
      const run = step.run ?? "";
      if (/demo/.test(run)) expect(run).toBe("npm run demo:build");
    }
  });

  it("uploads nothing but the failure report, and deploys nothing", () => {
    const uploads = steps.filter(({ step }) => step.uses?.startsWith("actions/upload"));
    expect(uploads).toHaveLength(1);
    const [{ step }] = uploads;
    expect(step.if).toBe("failure()");
    expect(step.with?.path).toBe("playwright-report/");
    expect(JSON.stringify(step.with)).not.toMatch(/dist/);
    const commands = steps.map(({ step }) => `${step.uses ?? ""} ${step.run ?? ""}`).join("; ");
    expect(commands).not.toMatch(/vercel|deploy|pages-artifact|publish|rsync|scp /i);
  });

  it("builds the normal site before the browser tests and runs them last", () => {
    const run = workflow.jobs["browser-qa"].steps.map((step) => step.run ?? step.uses ?? "");
    expect(run.indexOf("npm run build")).toBeGreaterThan(run.indexOf("npm ci"));
    expect(run.indexOf("npm run demo:build")).toBeGreaterThan(run.indexOf("npm run build"));
    expect(run.indexOf("npm run test:e2e")).toBeGreaterThan(run.indexOf("npm run demo:build"));
  });
});
