import { spawnSync } from "node:child_process";
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
const check = (files: Record<string, string>) => findStructureViolations(contentRoot(files));

describe("check:posts compiles every body and rejects a second h1", () => {
  it("passes with no posts or events folder, an empty one, or YAML-only events", async () => {
    expect(await check({ "teams/a.yaml": "status: draft\n" })).toEqual([]);
    expect(await check({ "posts/.gitkeep": "" })).toEqual([]);
    expect(await check({ "events/a.yaml": "title: # x\n" })).toEqual([]);
  });

  it("passes safe bodies, with ## headings, code showing # and hashtags, in .md and .mdx", async () => {
    const body =
      "## Heading\n\n### Sub\n\n```bash\n# comment\n```\n\nUse `# x`, #hashtag and #!/bin/sh.";
    expect(await check({ "posts/a.md": fm(body), "events/b.mdx": fm(body) })).toEqual([]);
  });

  it("reports the forms the text rule cannot see, in posts and events, by relative file name", async () => {
    const problems = await check({
      "posts/ordered.md": fm("1. # Second"),
      "posts/quoted.md": fm("> Second\n> ====="),
      "posts/deep.md": fm("- item\n\n    # Second"),
      "events/nested.md": fm("- > # Second"),
      "events/dir/raw.mdx": fm("<h1>Second</h1>"),
      "posts/ok.md": fm("## Fine"),
    });
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
    expect(
      await check({ "posts/a.md": "---\ntitle: T\n# a yaml comment\n---\n## Fine\n" }),
    ).toEqual([]);
  });
});

describe(".mdx files go through the real MDX compiler, .md files through the Markdown renderer", () => {
  const indented = "text\n\n    # Second";

  it("treats the same text as code in .md but as a heading in .mdx (MDX has no indented code)", async () => {
    expect(await check({ "posts/a.md": fm(indented) })).toEqual([]);
    const problems = await check({ "posts/a.mdx": fm(indented) });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("body-h1");
  });

  it("rejects the computed-element bypass that no text rule can see, in posts and events", async () => {
    const computed = '{(() => { const Tag = "h" + "1"; return <Tag>Second</Tag>; })()}';
    const script = '{(() => { const T = "scr" + "ipt"; return <T>x</T>; })()}';
    const problems = await check({
      "posts/h1.mdx": fm(computed),
      "events/script.mdx": fm(script),
    });
    expect(problems).toHaveLength(2);
    for (const problem of problems) {
      expect(problem).toContain("body-mdx");
      expect(problem).toContain("JavaScript");
    }
  });

  it("rejects MDX imports and exports, and JSX h1", async () => {
    const problems = await check({
      "posts/import.mdx": fm("import X from './x.js'\n\n## H"),
      "posts/export.mdx": fm("export const a = 1\n\n## H"),
      "posts/jsx.mdx": fm("<h1>Second</h1>"),
    });
    expect(problems.map((p: string) => p.split(":")[1].trim()).sort()).toEqual([
      "body-h1",
      "body-mdx",
      "body-mdx",
    ]);
  });

  it("passes ordinary MDX: JSX, a safe expression, Markdown inside MDX, a table, a heading hierarchy", async () => {
    const body = [
      "## One",
      "",
      "{/* a note */}",
      "",
      "Total: {1 + 2}. Some *emphasis* and a [link](https://example.com).",
      "",
      "<details>",
      "<summary>More</summary>",
      "",
      "Text",
      "",
      "</details>",
      "",
      "### Two",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n");
    expect(await check({ "posts/ok.mdx": fm(body), "events/ok.mdx": fm(body) })).toEqual([]);
  });
});

describe("npm run check:posts fails with exit status 1", () => {
  const run = (root: string) =>
    spawnSync(process.execPath, ["scripts/check-body-structure.mjs", root], { encoding: "utf8" });

  it("exits 1 and names the file when a .mdx body breaks the rules", () => {
    const result = run(contentRoot({ "posts/bad.mdx": fm("{(() => <h1>x</h1>)()}") }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("check:posts failed");
    expect(result.stderr).toContain("bad.mdx");
  });

  it("exits 1 for a nested Markdown heading in a post and in an event", () => {
    expect(run(contentRoot({ "posts/a.md": fm("1. # T") })).status).toBe(1);
    expect(run(contentRoot({ "events/a.md": fm("> T\n> ===") })).status).toBe(1);
  });

  it("exits 0 for good bodies", () => {
    const result = run(contentRoot({ "posts/a.md": fm("## Fine"), "events/b.mdx": fm("## Fine") }));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("check:posts passed");
  });

  it("is run by `npm run check:posts`, after the text rule", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
    expect(scripts["check:posts"]).toBe(
      "node scripts/check-posts.mjs && node scripts/check-body-structure.mjs",
    );
  });
});
