import { readFileSync } from "node:fs";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { describe, expect, it } from "vitest";
import scrollableTables, { scrollWrapper, tableLabel } from "../../scripts/scrollable-tables.mjs";

type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};
const table = (): Node => ({
  type: "element",
  tagName: "table",
  properties: {},
  children: [
    { type: "element", tagName: "thead", children: [] },
    { type: "element", tagName: "tbody", children: [] },
  ],
});

/** A stand-in for the visitor context: it records what the plugin replaces. */
const run = (tables: Node[]) => {
  const plugin = scrollableTables();
  const replaced: { node: Node; with: Node }[] = [];
  const ctx = { replaceNode: (node: Node, next: Node) => replaced.push({ node, with: next }) };
  for (const t of tables) plugin.element.visit(t, ctx);
  return { plugin, replaced };
};

describe("scrollable tables", () => {
  it("wraps a table in a focusable, labelled region and keeps the table itself", () => {
    const t = table();
    const { replaced } = run([t]);
    expect(replaced).toHaveLength(1);
    const wrapper = replaced[0].with;
    expect(wrapper.tagName).toBe("div");
    expect(wrapper.properties).toEqual({
      className: ["table-scroll"],
      role: "region",
      ariaLabel: "Table 1",
      tabIndex: 0,
    });
    expect(wrapper.children).toEqual([t]); // the real <table>, with its head and body, inside
    expect(wrapper.children?.[0].children?.map((c) => c.tagName)).toEqual(["thead", "tbody"]);
  });

  it("numbers the labels in page order, so they differ", () => {
    const { replaced } = run([table(), table(), table()]);
    expect(replaced.map((r) => r.with.properties?.ariaLabel)).toEqual([
      "Table 1",
      "Table 2",
      "Table 3",
    ]);
    expect(tableLabel(2)).toBe("Table 2");
    expect(scrollWrapper(table(), 4).properties?.ariaLabel).toBe("Table 4");
  });

  it("does not wrap the same table twice, so the wrapper's own table is left alone", () => {
    const t = table();
    const plugin = scrollableTables();
    const calls: Node[] = [];
    const ctx = { replaceNode: (_: Node, next: Node) => calls.push(next) };
    plugin.element.visit(t, ctx);
    plugin.element.visit(t, ctx);
    expect(calls).toHaveLength(1);
  });

  it("only visits tables, and counts per page (a new plugin starts at 1 again)", () => {
    expect(scrollableTables().element.filter).toEqual(["table"]);
    expect(scrollableTables().name).toBe("scrollable-tables");
    expect(run([table()]).replaced[0].with.properties?.ariaLabel).toBe("Table 1");
    expect(run([table()]).replaced[0].with.properties?.ariaLabel).toBe("Table 1");
  });

  it("is registered for Markdown and MDX, and the table is no longer made scrollable itself", () => {
    expect(readFileSync("astro.config.mjs", "utf8")).toMatch(
      /processor:\s*satteri\(\{[^}]*hastPlugins:\s*\[scrollableTables\]/,
    );
    const css = readFileSync("src/components/blog/PostBody.astro", "utf8");
    expect(css).toContain(".table-scroll");
    // The <table> keeps its table display (a block table loses its semantics in some browsers).
    const tableRule = /\.prose :global\(table\) \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(tableRule).not.toMatch(/display:\s*block/);
    expect(tableRule).not.toMatch(/overflow/);
  });
});

describe("tables the plugin does not wrap still cannot widen the page", () => {
  const render = async (md: string) =>
    (await createSatteriMarkdownProcessor({ hastPlugins: [scrollableTables] })).render(md, {
      frontmatter: {},
    });
  const css = readFileSync("src/components/blog/PostBody.astro", "utf8");

  it("wraps a Markdown table but not a raw HTML table (a different node)", async () => {
    const markdown = (await render("| a | b |\n|---|---|\n| 1 | 2 |")).code;
    expect(markdown).toContain('class="table-scroll"');
    const raw = (await render("<table><tr><td>wide</td></tr></table>")).code;
    expect(raw).toContain("<table>");
    expect(raw).not.toContain("table-scroll");
  });

  it("gives an unwrapped table the old self-scrolling rule, scoped to tables outside a wrapper", () => {
    const rule =
      /\.prose :global\(table:not\(\.table-scroll > table\)\) \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/display:\s*block/);
    expect(rule).toMatch(/max-width:\s*100%/);
    expect(rule).toMatch(/overflow-x:\s*auto/);
  });

  it("leaves a wrapped table's own display and the wrapper's behavior alone", () => {
    expect(/\.prose :global\(\.table-scroll > table\) \{([^}]*)\}/.exec(css)?.[1]).toMatch(
      /width:\s*max-content/,
    );
    expect(/\.prose :global\(\.table-scroll\) \{([^}]*)\}/.exec(css)?.[1]).toMatch(
      /overflow-x:\s*auto/,
    );
    const generic = /\.prose :global\(table\) \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(generic).not.toMatch(/display:|overflow|width:/);
  });
});
