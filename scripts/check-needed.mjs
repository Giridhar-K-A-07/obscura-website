// Fails when a "verified" content record still contains a [[NEEDED: ...]] marker,
// or when a content file has no status (Master Brief §13.2, §13.3).
// Draft records may contain markers. Run with: npm run check:needed
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = /\[\[NEEDED:[^\]]*\]\]/;
const CONTENT_FILE = /\.(ya?ml|md|mdx)$/;

function* contentFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* contentFiles(path);
    else if (CONTENT_FILE.test(entry)) yield path;
  }
}

/** Returns a list of problems found under `root` (the content folder). */
export function findViolations(root) {
  const problems = [];
  for (const entry of readdirSync(root)) {
    const folder = join(root, entry);
    // Files directly in the content root (such as README.md) are documentation, not records.
    if (!statSync(folder).isDirectory()) continue;
    for (const file of contentFiles(folder)) {
      const text = readFileSync(file, "utf8");
      const status = /^status:\s*["']?(\w+)["']?\s*$/m.exec(text)?.[1];
      const name = relative(root, file);
      if (!status) problems.push(`${name}: no status (expected "draft" or "verified")`);
      else if (status === "verified" && MARKER.test(text)) {
        problems.push(`${name}: verified record still contains a [[NEEDED: …]] marker`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../content", import.meta.url));
  const problems = findViolations(root);
  if (problems.length) {
    console.error(`check:needed failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("check:needed passed: no verified record contains a [[NEEDED: …]] marker.");
}
