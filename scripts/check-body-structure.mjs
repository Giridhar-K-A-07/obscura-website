// Fails when a blog post or an event body (content/posts, content/events: *.md, *.mdx) breaks the
// body rules that only the real parser can judge: a level-1 heading in any form, or JavaScript in an
// MDX body. Each body is compiled by the same processor the site build uses (body-processor.mjs):
// `.md` files by its Markdown renderer, `.mdx` files by its MDX compiler (the one @astrojs/mdx
// calls), both with the no-body-h1 plugin. So CI and the real build parse every file alike,
// including MDX-only syntax (indented headings are headings in MDX, for instance, not code).
// This is the authority behind the faster text rule in check-posts.mjs: headings can hide in
// nested lists and quotes that a line pattern cannot see, and Astro's content loader only logs a
// render error and drops the entry, so without this step the build would succeed and the article
// would silently be missing. Run by `npm run check:posts`.
//
// Usage: node scripts/check-body-structure.mjs [content-folder]   (default: ./content)
import { readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BODY_FOLDERS, bodyFiles, stripFrontmatter } from "./check-posts.mjs";
import { bodyProcessor } from "./body-processor.mjs";

// No syntax highlighting: code blocks are not headings, and highlighting only costs time here.
const SHARED = { syntaxHighlight: false };

/** The rule and message of a render error from the body plugin, without the absolute file path. */
function describe(error) {
  const message = String(error?.message ?? error);
  const rule = error?.rule ?? (/level-1 heading|<h1>/.test(message) ? "body-h1" : "body-structure");
  return { rule, message: message.replace(/^.*?\.mdx?:\s+/s, "") };
}

/** Returns the problems found in the bodies under `root` (the content folder), as text lines. */
export async function findStructureViolations(root) {
  const processor = bodyProcessor();
  const markdown = await processor.createRenderer(SHARED);
  const mdx = await processor.createMdxRenderer(SHARED, { optimize: false });
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
        if (extname(file) === ".mdx") await mdx.process(body, file, {});
        else await markdown.render(body, { fileURL: pathToFileURL(file), frontmatter: {} });
      } catch (error) {
        const { rule, message } = describe(error);
        problems.push(`${relative(root, file)}: ${rule}: ${message}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2]
    ? resolve(process.argv[2])
    : fileURLToPath(new URL("../content", import.meta.url));
  const problems = await findStructureViolations(root);
  if (problems.length) {
    console.error(`check:posts failed (structure):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("check:posts passed: no post or event body breaks the Markdown/MDX body rules.");
}
