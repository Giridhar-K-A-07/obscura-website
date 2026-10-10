import { readFileSync } from "node:fs";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { describe, expect, it } from "vitest";
import noBodyH1, { bodyH1Error, fileLabel } from "../../scripts/no-body-h1.mjs";
import { findUnsafe } from "../../scripts/check-posts.mjs";

/*
  These tests render Markdown with the real Sätteri renderer that Astro uses, so the parser is the
  source of truth: the plugin must reject exactly what the renderer would turn into an <h1>.
*/
const FILE = new URL("file:///project/content/posts/test-post.md");
const withPlugin = createSatteriMarkdownProcessor({ mdastPlugins: [noBodyH1] });
const withoutPlugin = createSatteriMarkdownProcessor({});

const render = async (md: string, processor = withPlugin) =>
  (await processor).render(md, { fileURL: FILE, frontmatter: {} });
/** Whether the real renderer turns this Markdown into an <h1> (no plugin involved). */
const rendersH1 = async (md: string) => /<h1[\s>]/i.test((await render(md, withoutPlugin)).code);
const rejected = async (md: string) => {
  try {
    await render(md);
    return false;
  } catch (error) {
    return /level-1 heading|<h1>/.test(String(error));
  }
};

const mustReject: Record<string, string> = {
  "an ATX heading": "Intro.\n\n# Title",
  "an ordered-list heading (1.)": "1. # Title",
  "an ordered-list heading (1))": "1) # Title",
  "an ordered-list heading (10.)": "10. # Title",
  "a quoted ordered-list heading": "> 1. # Title",
  "a quoted setext heading": "> Title\n> ===",
  "a nested quoted setext heading": "> > Title\n> > ===",
  "a quoted ordered-list setext heading": "> 1. Title\n>    ===",
  "a list inside a list": "- - # Title",
  "an ordered list inside a list": "1. - # Title",
  "a quote inside a list": "- > # Title",
  "a list item continued at 4 spaces": "- item\n\n    # Title",
  "an ordered item continued at 4 spaces": "10. item\n\n    # Title",
  "a setext heading": "Title\n=====",
  "an ATX heading with closing hashes": "# Title #",
  "a raw <h1> tag": "<h1>Title</h1>",
  "a raw <h1> in a list": "- <h1>Title</h1>",
};

const mustAllow: Record<string, string> = {
  "## heading": "## Heading",
  "### heading": "### Heading\n\n#### Deeper\n\n###### Deepest",
  "fenced code with #": "```bash\n# a comment\n```",
  "tilde code with #": "~~~md\n# Not a heading\n~~~",
  "inline code with #": "Use `# Title` for a page title.",
  "a #hashtag": "#hashtag",
  "a shebang": "#!/bin/sh",
  "ordinary text with #": "Issue #12 is fixed, and a # b is a comparison.",
  "indented code with #": "text\n\n    # not a heading",
  "a list of H2s": "- ## Item heading",
  "an <h2> tag": "<h2>Heading</h2>",
  "code showing an <h1> tag": "```html\n<h1>Title</h1>\n```",
};

describe("a depth-1 heading in a body fails the render", () => {
  for (const [name, md] of Object.entries(mustReject)) {
    it(`rejects ${name}`, async () => {
      expect(await rendersH1(md)).toBe(true); // the real renderer does make it an <h1>
      expect(await rejected(md)).toBe(true);
    });
  }

  it("names the file and says how to fix it", async () => {
    await expect(render("# Title")).rejects.toThrow(/test-post\.md/);
    await expect(render("# Title")).rejects.toThrow(/start its headings at "##"/);
    expect(bodyH1Error(FILE, "an <h1> tag").message).toContain("one h1");
    expect(fileLabel(undefined)).toBe("(unknown file)");
  });
});

describe("valid bodies still render", () => {
  for (const [name, md] of Object.entries(mustAllow)) {
    it(`allows ${name}`, async () => {
      expect(await rendersH1(md)).toBe(false);
      const { code } = await render(md);
      expect(code).not.toMatch(/<h1[\s>]/i);
    });
  }

  it("keeps the headings, with their ids, in a normal article", async () => {
    const { code } = await render("Intro.\n\n## First\n\nText.\n\n### Part\n\nMore.");
    expect(code).toMatch(/<h2[^>]*>First<\/h2>/);
    expect(code).toMatch(/<h3[^>]*>Part<\/h3>/);
  });
});

describe("the renderer decides: the plugin rejects exactly what renders as an <h1>", () => {
  const prefixes = [
    "",
    "> ",
    "> > ",
    "- ",
    "* ",
    "+ ",
    "1. ",
    "1) ",
    "10. ",
    "- - ",
    "1. - ",
    "> - ",
    "> 1. ",
    "- > ",
    "- [ ] ",
    "  ",
    "   ",
    "    ",
    "- a\n\n  ",
    "- a\n\n    ",
    "1. a\n\n   ",
    "10. a\n\n    ",
    "> - a\n>\n>   ",
  ];
  const forms = [
    (p: string) => `${p}# T`,
    (p: string) => `${p}T\n${p.replace(/[^ >\t-]/g, " ")}===`,
    (p: string) => `${p}<h1>T</h1>`,
    (p: string) => `${p}## T`,
    (p: string) => `${p}\`# T\``,
  ];

  it("agrees with the real renderer on every block and list combination", async () => {
    const disagreements: string[] = [];
    let count = 0;
    for (const prefix of prefixes) {
      for (const form of forms) {
        const md = form(prefix);
        count += 1;
        const h1 = await rendersH1(md);
        const caught = await rejected(md);
        if (h1 !== caught)
          disagreements.push(JSON.stringify({ md, renders: h1, rejected: caught }));
      }
    }
    expect(count).toBe(prefixes.length * forms.length);
    expect(disagreements).toEqual([]);
  });

  it("is stricter than the text rule where that rule cannot see the structure", async () => {
    for (const md of ["1. # Title", "> Title\n> ===", "- item\n\n    # Title"]) {
      expect(findUnsafe(md).some((p: { rule: string }) => p.rule === "body-h1")).toBe(false);
      expect(await rejected(md)).toBe(true);
    }
  });
});

describe("MDX", () => {
  type Visitor = Record<string, (node: unknown, ctx: unknown) => void>;
  const plugin = noBodyH1 as unknown as Visitor;
  const ctx = { fileURL: FILE };
  const visit = (kind: "mdxJsxFlowElement" | "mdxJsxTextElement", name: string) =>
    plugin[kind]({ name }, ctx);

  it("rejects an <h1> JSX element, flow or inline, and allows other elements", () => {
    expect(() => visit("mdxJsxFlowElement", "h1")).toThrow(/<h1> element/);
    expect(() => visit("mdxJsxTextElement", "h1")).toThrow(/<h1> element/);
    for (const name of ["h2", "h10", "Chart", "table"]) {
      expect(() => visit("mdxJsxFlowElement", name)).not.toThrow();
    }
  });

  it("uses the same depth-1 check for a heading node, whichever the format", () => {
    expect(() => plugin.heading({ depth: 1 }, ctx)).toThrow(/level-1 heading/);
    for (const depth of [2, 3, 4, 5, 6]) expect(() => plugin.heading({ depth }, ctx)).not.toThrow();
  });
});

describe("it protects both blog posts and events", () => {
  it("is a plugin of the one Markdown processor that renders every body", () => {
    expect(readFileSync("astro.config.mjs", "utf8")).toMatch(/processor:\s*bodyProcessor\(\)/);
    expect(readFileSync("scripts/body-processor.mjs", "utf8")).toMatch(
      /satteri\(\{\s*mdastPlugins:\s*\[noBodyH1\]/,
    );
    const config = readFileSync("src/content.config.ts", "utf8");
    expect(config).toMatch(/posts:\s*collection\("posts",\s*"posts"/);
    expect(config).toMatch(/events:\s*collection\("events",\s*"events"/);
    // Both pages render the body through the content collection, i.e. through that processor.
    expect(readFileSync("src/pages/blog/[slug].astro", "utf8")).toContain("render(entry)");
    expect(readFileSync("src/pages/events/[slug].astro", "utf8")).toContain("render(entry)");
  });
});
