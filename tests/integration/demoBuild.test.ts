import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { HOSTED_ENV } from "../../src/lib/demoMode";

/*
  These tests run the real commands: the Astro config's refusal, the demo wrapper, a demo build, a
  normal build after it, and the build guard on both, the way a person would. They spawn Astro,
  so they live in one file and run one after another (two Astro processes must not share .astro/
  at the same time). They write only git-ignored folders: dist/, dist-demo/ and .astro/.
*/
const astro = "node_modules/astro/bin/astro.mjs";
const MARKER = "X-OBSCURA-BUILD:DEMO";

/**
  The environment with the demo variables and the Vitest variables removed, plus `extra`. Build-server
  variables stay as they are, so the tests also run where CI is set: an intentional demo build says
  so with OBSCURA_DEMO_ALLOW_CI=1, the documented override.
*/
const cleanEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of ["OBSCURA_DEMO", "OBSCURA_DEMO_ALLOW_CI"]) delete env[name];
  // Vitest sets NODE_ENV, DEV, PROD, MODE, TEST and VITEST*, and Astro reads them: left in, a spawned
  // build would emit its development-only pages. A real build runs without them.
  for (const name of Object.keys(env)) {
    if (["NODE_ENV", "DEV", "PROD", "MODE", "TEST"].includes(name) || name.startsWith("VITEST")) {
      delete env[name];
    }
  }
  return { ...env, ...extra };
};
/** Like `cleanEnv`, with every build-server variable removed first: the refusal tests set exactly one. */
const hostFreeEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env = cleanEnv();
  for (const name of HOSTED_ENV) delete env[name];
  return { ...env, ...extra };
};
const node = (args: string[], env: NodeJS.ProcessEnv, timeout = 240_000) =>
  spawnSync(process.execPath, args, { encoding: "utf8", env, timeout });
const output = (r: { stdout: string; stderr: string }) => `${r.stdout}${r.stderr}`;

const walk = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const scratch: string[] = [];
afterAll(() => {
  for (const folder of scratch.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("the real Astro config enforces the refusal", () => {
  const sync = (env: NodeJS.ProcessEnv) => node([astro, "sync"], env, 90_000);

  it("stops `astro sync` with a clear message when a build server is detected", () => {
    for (const host of ["CI", "NETLIFY", "GITHUB_ACTIONS"]) {
      const result = sync(hostFreeEnv({ OBSCURA_DEMO: "1", [host]: "true" }));
      expect(result.status, host).not.toBe(0);
      expect(output(result), host).toMatch(/never be built or deployed/);
      expect(output(result), host).toContain(host);
    }
  }, 300_000);

  it("lets it through with the explicit override, and never refuses a normal run", () => {
    expect(
      sync(cleanEnv({ OBSCURA_DEMO: "1", CI: "true", OBSCURA_DEMO_ALLOW_CI: "1" })).status,
    ).toBe(0);
    expect(sync(cleanEnv({ CI: "true" })).status).toBe(0);
  }, 300_000);

  it("shows usage and exits 2 when the demo wrapper gets no or a wrong command", () => {
    for (const args of [[], ["serve"]]) {
      const result = node(["scripts/demo.mjs", ...args], cleanEnv(), 30_000);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("Usage");
    }
  });
});

describe("a demo build, then a normal build, then the guard", () => {
  it("builds and checks the demo, with every calendar file labelled", () => {
    const result = node(["scripts/demo.mjs", "build"], cleanEnv({ OBSCURA_DEMO_ALLOW_CI: "1" }));
    expect(result.status, output(result).slice(-600)).toBe(0);
    expect(result.stdout).toContain("DEMO build (synthetic data, local only)");

    const files = walk("dist-demo");
    const calendars = files.filter((f) => f.endsWith(".ics"));
    expect(calendars.length).toBeGreaterThan(5);
    for (const file of calendars) {
      const text = readFileSync(file, "utf8");
      expect(text, file).toContain(MARKER);
      expect(text, file).toMatch(/SUMMARY:\[DEMO\] /);
      expect(text, file).toMatch(/DESCRIPTION:\[DEMO\] /);
    }
    for (const page of ["index.html", "404.html", "events/index.html"]) {
      const html = readFileSync(join("dist-demo", page), "utf8");
      expect(html, page).toContain("data-demo-banner");
      expect(html, page).toContain('content="noindex, nofollow"');
      expect(html, page).toMatch(/<title>DEMO — /);
    }
  }, 300_000);

  it("then a normal build holds no demo trace and passes the guard", () => {
    const build = node([astro, "build"], cleanEnv());
    expect(build.status, output(build).slice(-600)).toBe(0);
    const check = node(["scripts/check-build.mjs"], cleanEnv());
    expect(check.status, output(check)).toBe(0);
    expect(check.stdout).toContain("Mode: prototype (noindex)");

    for (const file of walk("dist")) {
      if (/\.(png|jpe?g|webp|avif|ico|woff2?)$/i.test(file)) continue;
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(
        /data-demo-banner|obscura-build|X-OBSCURA-BUILD|\[DEMO\]|Test Person|DEMO — /,
      );
    }
    expect(existsSync(join("dist", "demo"))).toBe(false);
  }, 300_000);

  it("rejects demo output in the normal dist/ folder, with or without OBSCURA_DEMO", () => {
    const parent = mkdtempSync(join(tmpdir(), "obscura-guard-"));
    scratch.push(parent);
    cpSync("dist-demo", join(parent, "dist"), { recursive: true });
    const folder = join(parent, "dist");
    for (const [args, env] of [
      [[folder], cleanEnv()],
      [["--demo", folder], cleanEnv()],
      [["--demo", folder], cleanEnv({ OBSCURA_DEMO: "1" })],
      [[folder], cleanEnv({ OBSCURA_DEMO: "1" })],
    ] as [string[], NodeJS.ProcessEnv][]) {
      const result = node(["scripts/check-build.mjs", ...args], env, 60_000);
      expect(result.status, `${args.join(" ")} ${env.OBSCURA_DEMO ?? ""}`).toBe(1);
    }
  }, 120_000);

  it("rejects a demo calendar file copied into a normal build", () => {
    const parent = mkdtempSync(join(tmpdir(), "obscura-guard-"));
    scratch.push(parent);
    cpSync("dist", join(parent, "dist"), { recursive: true });
    mkdirSync(join(parent, "dist", "events"), { recursive: true });
    const demoCalendar = walk("dist-demo").find((f) => f.endsWith(".ics")) as string;
    cpSync(demoCalendar, join(parent, "dist", "events", "copied.ics"));
    const result = node(["scripts/check-build.mjs", join(parent, "dist")], cleanEnv(), 60_000);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("events/copied.ics");
    expect(result.stderr).toContain("must not contain a demo trace");
  }, 120_000);

  it("accepts the demo output in dist-demo/ only with --demo", () => {
    expect(
      node(["scripts/check-build.mjs", "--demo", "dist-demo"], cleanEnv(), 60_000).status,
    ).toBe(0);
    expect(node(["scripts/check-build.mjs", "dist-demo"], cleanEnv(), 60_000).status).toBe(1);
    expect(
      node(["scripts/check-build.mjs", "dist-demo"], cleanEnv({ OBSCURA_DEMO: "1" }), 60_000)
        .status,
    ).toBe(1);
  }, 120_000);
});
