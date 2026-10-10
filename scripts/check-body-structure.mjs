// Fails when a blog post or an event body (content/posts, content/events: *.md, *.mdx) contains a
// level-1 heading in any form, by rendering each body with the real Markdown renderer plus the
// no-body-h1 plugin. This is the authoritative check behind the faster text rule in
// check-posts.mjs: headings can hide in nested lists and quotes that a line pattern cannot see, and
// Astro's content loader only logs a render error and drops the entry, so without this step the
// build would succeed and the article would silently be missing. Run by `npm run check:posts`.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { BODY_FOLDERS, bodyFiles, stripFrontmatter } from "./check-posts.mjs";
import noBodyH1 from "./no-body-h1.mjs";

/** Returns the problems found in the bodies under `root` (the content folder), as text lines. */
export async function findStructureViolations(root) {
  const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [noBodyH1] });
  const problems = [];
  for (const name of BODY_FOLDERS) {
    let files;
    try {
      files = [...bodyFiles(join(root, name))];
    } catch {
      continue; // no such folder: nothing to check
    }
    for (const file of files) {
      const body = stripFrontmatter(readFileSync(file, "utf8"));
      try {
        await processor.render(body, { fileURL: pathToFileURL(file), frontmatter: {} });
      } catch (error) {
        // The plugin's message starts with the file; the report names it relative to the content folder.
        const message = String(error?.message ?? error).replace(
          /^[\s\S]*?:\s+(?=a level-1 heading|an <h1>)/,
          "",
        );
        problems.push(`${relative(root, file)}: body-h1: ${message}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../content", import.meta.url));
  const problems = await findStructureViolations(root);
  if (problems.length) {
    console.error(`check:posts failed (structure):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("check:posts passed: no post or event body renders a second h1.");
}
