import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILD_DIR } from "./site";

/**
  The browser tests read the built output; they never build it. Fail early and clearly when a
  folder is missing, instead of with a confusing page error from the preview server.
*/
export default function globalSetup() {
  const missing = Object.entries(BUILD_DIR).filter(
    ([, dir]) => !existsSync(join(dir, "index.html")),
  );
  if (missing.length === 0) return;
  const hint = missing
    .map(
      ([mode, dir]) =>
        `  ${dir}/  (${mode})  ->  ${mode === "demo" ? "npm run demo:build" : "npm run build"}`,
    )
    .join("\n");
  throw new Error(`The browser tests need a built site first. Missing:\n${hint}`);
}
