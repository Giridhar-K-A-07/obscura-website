import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findStructureViolations } from "../../scripts/check-body-structure.mjs";

const folders: string[] = [];
const contentRoot = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "obscura-structure-"));
  folders.push(root);
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
};
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const fm = (body: string) => `---\ntitle: T\n---\n${body}\n`;

describe("check:posts renders every body and rejects a second h1", () => {
  it("passes with no posts or events folder, an empty one, or YAML-only events", async () => {
    expect(
      await findStructureViolations(contentRoot({ "teams/a.yaml": "status: draft\n" })),
    ).toEqual([]);
    expect(await findStructureViolations(contentRoot({ "posts/.gitkeep": "" }))).toEqual([]);
    expect(await findStructureViolations(contentRoot({ "events/a.yaml": "title: # x\n" }))).toEqual(
      [],
    );
  });

  it("passes safe bodies, with ## headings, code showing # and hashtags, in .md and .mdx", async () => {
    const body =
      "## Heading\n\n### Sub\n\n```bash\n# comment\n```\n\nUse `# x`, #hashtag and #!/bin/sh.";
    const root = contentRoot({ "posts/a.md": fm(body), "events/b.mdx": fm(body) });
    expect(await findStructureViolations(root)).toEqual([]);
  });

  it("reports the forms the text rule cannot see, in posts and events, by relative file name", async () => {
    const root = contentRoot({
      "posts/ordered.md": fm("1. # Second"),
      "posts/quoted.md": fm("> Second\n> ====="),
      "posts/deep.md": fm("- item\n\n    # Second"),
      "events/nested.md": fm("- > # Second"),
      "events/dir/raw.mdx": fm("<h1>Second</h1>"),
      "posts/ok.md": fm("## Fine"),
    });
    const problems = await findStructureViolations(root);
    expect(problems).toHaveLength(5);
    const names = problems.map((p: string) => p.split(":")[0].replace(/\\/g, "/")).sort();
    expect(names).toEqual([
      "events/dir/raw.mdx",
      "events/nested.md",
      "posts/deep.md",
      "posts/ordered.md",
      "posts/quoted.md",
    ]);
    for (const problem of problems) {
      expect(problem).toContain("body-h1");
      expect(problem).toContain('start its headings at "##"');
      expect(problem).not.toMatch(/[A-Za-z]:\\|\/tmp\//); // relative, not an absolute path
    }
  });

  it("ignores front matter, so a # comment in it is not a heading", async () => {
    const root = contentRoot({ "posts/a.md": "---\ntitle: T\n# a yaml comment\n---\n## Fine\n" });
    expect(await findStructureViolations(root)).toEqual([]);
  });

  it("is part of `npm run check:posts`", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
    expect(scripts["check:posts"]).toContain("scripts/check-posts.mjs");
    expect(scripts["check:posts"]).toContain("scripts/check-body-structure.mjs");
  });
});
