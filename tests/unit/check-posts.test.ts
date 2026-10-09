import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findPostViolations,
  findUnsafe,
  stripCode,
  stripFrontmatter,
} from "../../scripts/check-posts.mjs";

const rules = (body: string) => findUnsafe(body).map((p: { rule: string }) => p.rule);

describe("allowed constructs", () => {
  it("allows plain prose, headings, lists, tables and blockquotes", () => {
    const body = "# Title\n\nSome text.\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n> quote";
    expect(findUnsafe(body)).toEqual([]);
  });

  it("allows https links, site-path links and in-page anchors", () => {
    expect(rules("[a](https://example.com/a) [b](/events/x) [c](#section)")).toEqual([]);
    expect(rules('[t](https://example.com/a "A title")')).toEqual([]);
  });

  it("allows images with alt text from https or a site path", () => {
    expect(rules("![A chart](https://example.com/c.png) ![Photo](/posts/p.jpg)")).toEqual([]);
    expect(rules('<img src="https://example.com/c.png" alt="A chart">')).toEqual([]);
  });

  it("allows autolinks and reference links that are https", () => {
    expect(rules("<https://example.com/a>\n\n[ref]: https://example.com/b")).toEqual([]);
  });

  it("does not scan code blocks or inline code", () => {
    const body = [
      "Use `<script>` carefully and `[x](javascript:alert(1))`.",
      "```html",
      "<script>alert(1)</script>",
      '<a href="javascript:alert(1)" onclick="x()">x</a>',
      "![](http://example.com/a.png)",
      "```",
      "~~~js",
      "import x from 'y';",
      "export const z = 1;",
      "~~~",
    ].join("\n");
    expect(findUnsafe(body)).toEqual([]);
  });

  it("does not mistake ordinary prose for an MDX import or export", () => {
    expect(rules("We import the data, then export it.\nimport this idea into your work")).toEqual(
      [],
    );
  });
});

describe("unsafe constructs", () => {
  it("rejects scripts and other active HTML", () => {
    for (const tag of [
      "script",
      "iframe",
      "object",
      "embed",
      "style",
      "form",
      "base",
      "meta",
      "link",
    ]) {
      expect(rules(`<${tag} src="x"></${tag}>`)).toContain("blocked-html-tag");
    }
    expect(rules("<SCRIPT>alert(1)</SCRIPT>")).toContain("blocked-html-tag");
    expect(rules("< script >alert(1)</ script >")).toContain("blocked-html-tag");
  });

  it("rejects event-handler attributes", () => {
    expect(rules('<img src="/a.png" alt="x" onerror="steal()">')).toContain(
      "event-handler-attribute",
    );
    expect(rules("<div onClick={() => run()}>x</div>")).toContain("event-handler-attribute");
  });

  it("rejects javascript:, vbscript: and data: links", () => {
    for (const body of [
      "[x](javascript:alert(1))",
      "[x]( JavaScript:alert(1))",
      "[x](vbscript:run)",
      "[x](data:text/html,<b>x</b>)",
      '<a href="javascript:alert(1)">x</a>',
      "<javascript:alert(1)>",
      "[ref]: javascript:alert(1)",
    ]) {
      expect(findUnsafe(body).length).toBeGreaterThan(0);
    }
  });

  it("rejects links that are not https, a site path or an anchor", () => {
    for (const url of [
      "http://example.com",
      "ftp://example.com/a",
      "//example.com/a",
      "mailto:a@example.com",
      "relative/path",
      "example.com",
    ]) {
      expect(rules(`[x](${url})`)).toContain("unsafe-link");
    }
    expect(rules('<a href="http://example.com">x</a>')).toContain("unsafe-link");
    expect(rules("<http://example.com>")).toContain("unsafe-link");
    expect(rules("[ref]: http://example.com")).toContain("unsafe-link");
  });

  it("rejects images without alt text, in Markdown and HTML", () => {
    expect(rules("![](https://example.com/a.png)")).toContain("image-missing-alt");
    expect(rules("![   ](https://example.com/a.png)")).toContain("image-missing-alt");
    expect(rules('<img src="https://example.com/a.png">')).toContain("image-missing-alt");
    expect(rules('<img src="https://example.com/a.png" alt="">')).toContain("image-missing-alt");
  });

  it("rejects image sources that are not https or a site path", () => {
    for (const src of [
      "http://example.com/a.png",
      "data:image/png;base64,AAAA",
      "//example.com/a.png",
      "a.png",
    ]) {
      expect(rules(`![Alt text](${src})`)).toContain("unsafe-media-url");
    }
    expect(rules('<img src="http://example.com/a.png" alt="x">')).toContain("unsafe-media-url");
  });

  it("rejects MDX imports, exports and client directives, which would add JavaScript", () => {
    expect(rules("import Chart from '../components/Chart.astro';")).toContain("mdx-import-export");
    expect(rules("import { x } from 'y'")).toContain("mdx-import-export");
    expect(rules('import "side-effect"')).toContain("mdx-import-export");
    expect(rules("export const meta = {};")).toContain("mdx-import-export");
    expect(rules("<Chart client:load />")).toContain("client-directive");
  });

  it("reports each problem with its rule and a short detail", () => {
    const problems = findUnsafe("<script>x</script>\n\n[a](http://example.com)");
    expect(problems.map((p: { rule: string }) => p.rule)).toEqual([
      "blocked-html-tag",
      "unsafe-link",
    ]);
    expect(problems[0].detail).toContain("<script");
  });
});

describe("helpers", () => {
  it("strips front matter, and only at the start", () => {
    expect(stripFrontmatter("---\ntitle: x\n---\nBody")).toBe("Body");
    expect(stripFrontmatter("Body\n---\nnot: front matter\n---\n")).toContain("not: front matter");
    expect(stripFrontmatter("Body only")).toBe("Body only");
  });

  it("strips fenced code (backticks and tildes) and inline code", () => {
    const out = stripCode("a `b` c\n```\nhidden\n```\nd\n~~~\nalso hidden\n~~~\ne");
    expect(out).not.toContain("hidden");
    expect(out).not.toContain("`b`");
    expect(out).toContain("a  c");
    expect(out).toContain("d");
    expect(out).toContain("e");
  });
});

describe("check:posts over a content folder", () => {
  const folders: string[] = [];
  const contentRoot = (files: Record<string, string>) => {
    const root = mkdtempSync(join(tmpdir(), "obscura-posts-"));
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

  it("passes with no posts folder, or an empty one", () => {
    expect(findPostViolations(contentRoot({ "teams/a.yaml": "status: draft\n" }))).toEqual([]);
    expect(findPostViolations(contentRoot({ "posts/.gitkeep": "" }))).toEqual([]);
  });

  it("passes a safe .md and .mdx post, ignoring front matter", () => {
    const root = contentRoot({
      "posts/a.md": "---\ntitle: Test\n---\nSafe [link](https://example.com).",
      "posts/b.mdx": "---\ntitle: Test\n---\nSafe **text**.",
    });
    expect(findPostViolations(root)).toEqual([]);
  });

  it("reports an unsafe post by file name and rule, drafts included", () => {
    const root = contentRoot({
      "posts/bad.md": "---\nstatus: draft\n---\n<script>x</script>",
      "posts/nested/worse.mdx": "---\ntitle: T\n---\n![](https://example.com/a.png)",
      "posts/fine.md": "Fine.",
    });
    const problems = findPostViolations(root);
    expect(problems).toHaveLength(2);
    expect(
      problems.some((p: string) => p.includes("bad.md") && p.includes("blocked-html-tag")),
    ).toBe(true);
    expect(
      problems.some((p: string) => p.includes("worse.mdx") && p.includes("image-missing-alt")),
    ).toBe(true);
  });

  it("ignores files that are not posts", () => {
    const root = contentRoot({
      "posts/data.yaml": "title: <script>",
      "posts/notes.txt": "<script>",
    });
    expect(findPostViolations(root)).toEqual([]);
  });
});
