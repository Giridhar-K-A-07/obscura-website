import { describe, expect, it } from "vitest";
import { bodyProcessor } from "../../scripts/body-processor.mjs";
import { isInertExpression } from "../../scripts/no-body-h1.mjs";

/*
  These tests compile MDX with the real MDX compiler that @astrojs/mdx uses (reached through the
  same processor the site is configured with), so the parser is the source of truth. An MDX
  expression is opaque JavaScript to the parser, which is why one that could build an element is
  rejected rather than inspected.
*/
const FILE = "E:/project/content/posts/test-post.mdx";
const mdx = (async () => {
  const create = bodyProcessor().createMdxRenderer;
  if (!create) throw new Error("the body processor has no MDX renderer");
  return create({ syntaxHighlight: false }, { optimize: false });
})();
const compile = async (source: string) => (await mdx).process(source, FILE, {});

const outcome = async (source: string) => {
  try {
    await compile(source);
    return { ok: true as const };
  } catch (error) {
    const e = error as Error & { rule?: string };
    return { ok: false as const, rule: e.rule, message: e.message };
  }
};

const BACKTICK = String.fromCharCode(96);

const mustReject: Record<string, [string, "body-h1" | "body-mdx"]> = {
  "a computed <h1> built in an expression": [
    '{(() => { const Tag = "h" + "1"; return <Tag>Second</Tag>; })()}',
    "body-mdx",
  ],
  "a computed <script> built in an expression": [
    '{(() => { const Tag = "scr" + "ipt"; return <Tag>alert(1)</Tag>; })()}',
    "body-mdx",
  ],
  "an h1 built with the JSX runtime by name": ['{_jsx("h1", { children: "x" })}', "body-mdx"],
  "a literal <h1> in an expression": ["{<h1>Second</h1>}", "body-mdx"],
  "an inline expression": ["text {(() => <h1>x</h1>)()} more", "body-mdx"],
  "a template literal": [`{${BACKTICK}anything${BACKTICK}}`, "body-mdx"],
  "an identifier": ["{props.title}", "body-mdx"],
  "an element in an attribute expression": ["<div children={<h1>x</h1>}>y</div>", "body-mdx"],
  "a JSX spread attribute": ["<div {...props}>y</div>", "body-mdx"],
  "an MDX import": ["import Chart from './chart.js'\n\n## Heading", "body-mdx"],
  "an MDX export": ["export const meta = {}\n\n## Heading", "body-mdx"],
  "a normal JSX <h1>": ["<h1>Second</h1>", "body-h1"],
  "a self-closing JSX <h1>": ["<h1 />", "body-h1"],
  "a Markdown heading": ["# Title", "body-h1"],
  "a nested ordered-list heading": ["1. # Title", "body-h1"],
  "a quoted ordered-list heading": ["> 1. # Title", "body-h1"],
  "a quoted setext heading": ["> Title\n> ===", "body-h1"],
  "a list inside a quote inside a list": ["- > - # Title", "body-h1"],
  "a list item continued at 4 spaces": ["- item\n\n    # Title", "body-h1"],
  "a heading inside JSX children": ["<div>\n\n# Title\n\n</div>", "body-h1"],
  "an indented heading (a heading in MDX, code in Markdown)": ["text\n\n    # Title", "body-h1"],
};

const mustAllow: Record<string, string> = {
  "a comment expression": "{/* a note for editors */}\n\n## Heading",
  arithmetic: "Total: {1 + 2 * 3}",
  "plain strings": `Say {"hello"} and {'a' + 'b'}.`,
  "a literal attribute": '<div title="x">text</div>',
  "a literal attribute expression": "<div tabIndex={0}>text</div>",
  "a heading hierarchy": "## One\n\n### Two\n\n#### Three\n\n##### Four\n\n###### Five",
  "JSX elements that are not headings": "<details>\n<summary>More</summary>\n\nText\n\n</details>",
  "Markdown inside MDX":
    "## Heading\n\nSome *emphasis*, **strong**, a [link](https://example.com) and a list:\n\n- one\n- two",
  "a table": "## Data\n\n| a | b |\n|---|---|\n| 1 | 2 |",
  "code that looks like headings":
    "```bash\n# comment\n```\n\nUse `# Title`, #hashtag and #!/bin/sh. Issue #12.",
  "an <h2> element": "<h2>Heading</h2>",
};

describe("the MDX compiler rejects a second h1 and JavaScript in a body", () => {
  for (const [name, [source, rule]] of Object.entries(mustReject)) {
    it(`rejects ${name}`, async () => {
      const result = await outcome(source);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe(rule);
    });
  }

  it("names the file and says how to fix it", async () => {
    const h1 = await outcome("# Title");
    expect(h1.message).toContain("test-post.mdx");
    expect(h1.message).toContain('start its headings at "##"');
    const js = await outcome("{props.x}");
    expect(js.message).toContain("test-post.mdx");
    expect(js.message).toContain("JavaScript expressions");
  });
});

describe("ordinary MDX still compiles", () => {
  for (const [name, source] of Object.entries(mustAllow)) {
    it(`allows ${name}`, async () => {
      expect(await outcome(source)).toEqual({ ok: true });
    });
  }

  it("wraps an MDX Markdown table in the labelled scroll region", async () => {
    const { code } = await compile("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(code).toContain("table-scroll");
    expect(code).toContain("Table 1");
  });

  it("keeps an h2/h3 hierarchy in the compiled output", async () => {
    const { code } = await compile("## First\n\n### Part");
    expect(code).toMatch(/h2/);
    expect(code).toMatch(/h3/);
    expect(code).not.toMatch(/["']h1["']/);
  });
});

describe("what counts as an inert expression", () => {
  it("accepts comments, literals and arithmetic", () => {
    for (const code of [
      "",
      "  ",
      "/* a note */",
      "// a note",
      "1 + 2",
      "(1 + 2) * 3 % 4 - .5e2",
      '"text"',
      "'text'",
      '"a \\" quote" + \'b\'',
      "true",
      "false, null",
    ]) {
      expect(isInertExpression(code), code).toBe(true);
    }
  });

  it("rejects everything else: identifiers, elements, brackets, templates, statements", () => {
    for (const code of [
      "a",
      "props",
      "_jsx",
      "Math.PI",
      "<T/>",
      "1 < 2",
      "x[1]",
      "[1]",
      "{}",
      `${BACKTICK}t${BACKTICK}`,
      "1;2",
      "a = 1",
      "/* unterminated",
      '"unterminated',
      "truely",
      "nullable",
      "0x1F",
      "1 ? 2 : 3",
      "!1",
      "() => 1",
    ]) {
      expect(isInertExpression(code), code).toBe(false);
    }
  });
});
