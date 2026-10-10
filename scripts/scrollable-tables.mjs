// A small hast plugin (no dependency) that wraps each Markdown/MDX table in a scroll container.
//
// A wide table must scroll sideways inside itself instead of widening the page. Making the
// <table> itself scrollable (display: block; overflow-x: auto) removes its table semantics in some
// browsers and screen readers, so the table stays a real <table> and its wrapper scrolls instead.
// The wrapper is keyboard-focusable (a scrollable area that cannot take focus cannot be scrolled
// without a mouse) and is a labelled region, so assistive technology says what it is. Tables are
// numbered in page order, so their labels differ.
//
// Astro 7 renders Markdown and MDX with the Sätteri processor, whose plugins are objects with a
// `name` and a visitor per node type. This is one of them (registered in astro.config.mjs); the
// helpers are exported so the tests can check them.

/** The accessible name of the n-th table on the page. */
export const tableLabel = (n) => `Table ${n}`;

/** The wrapper element for one table. */
export const scrollWrapper = (table, n) => ({
  type: "element",
  tagName: "div",
  properties: {
    className: ["table-scroll"],
    role: "region",
    ariaLabel: tableLabel(n),
    tabIndex: 0,
  },
  children: [table],
});

/** The plugin factory: called once per document, so tables are counted per page. */
export default function scrollableTables() {
  const wrapped = new WeakSet();
  let n = 0;
  return {
    name: "scrollable-tables",
    element: {
      filter: ["table"],
      visit(node, ctx) {
        if (wrapped.has(node)) return; // the wrapper's own table is not wrapped again
        wrapped.add(node);
        n += 1;
        ctx.replaceNode(node, scrollWrapper(node, n));
      },
    },
  };
}
