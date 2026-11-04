// Runs Astro in DEMO mode: synthetic fixtures, a DEMO banner on every page, output in dist-demo/.
//   npm run demo           dev server on the fixtures
//   npm run demo:build     build to dist-demo/, then check it (check-build.mjs in demo mode)
//   npm run demo:preview   serve dist-demo/
// It only sets OBSCURA_DEMO=1 for the child process (so it works the same on Windows, macOS and
// Linux without a dependency). The demo never runs in CI or on Vercel: see src/lib/demoMode.ts.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const command = process.argv[2];
const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
const env = { ...process.env, OBSCURA_DEMO: "1" };

const run = (args) => spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });

if (!["dev", "build", "preview"].includes(command)) {
  console.error("Usage: node scripts/demo.mjs dev | build | preview");
  process.exit(2);
}

const first = run([astro, command]);
if (first.status !== 0 || command !== "build") process.exit(first.status ?? 1);

const check = run([join(root, "scripts", "check-build.mjs"), join(root, "dist-demo")]);
process.exit(check.status ?? 1);
