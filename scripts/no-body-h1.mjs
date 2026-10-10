// A Sätteri (Markdown/MDX) plugin that makes a second page-level h1 impossible, using the real
// parser as the source of truth.
//
// The page's title is its one h1 (Master Brief §11.1: one h1 per page), so an article or event
// body must start at ##. The text rule in check-posts.mjs (`findUnsafe`) gives authors a fast
// message, but headings can sit inside nested lists and quotes in many ways that a line pattern
// cannot cover. This plugin runs on the parsed tree while the page is rendered, so it sees every
// depth-1 heading however it was written, and nothing that is only code or text:
//  - an ATX or setext heading of depth 1, at any nesting (lists, quotes, list items in quotes);
//  - raw HTML containing an <h1> tag (Markdown), or an <h1> element (MDX).
// It fails the render (so the build or the dev server stops with the file named) instead of
// changing what the author wrote. Code blocks and inline code are not headings, so they pass.

import { fileURLToPath } from "node:url";

const H1_TAG = /<\s*h1\b/i;

export const fileLabel = (fileURL) => {
  if (!fileURL) return "(unknown file)";
  try {
    return fileURLToPath(fileURL);
  } catch {
    return String(fileURL.pathname ?? fileURL); // a URL that is not a local path on this platform
  }
};

/** The error thrown for a second h1. It names the file and says how to fix it. */
export const bodyH1Error = (fileURL, what) =>
  new Error(
    `${fileLabel(fileURL)}: ${what}. The page's title is its one h1, so an article or event body must ` +
      'start its headings at "##".',
  );

export default {
  name: "no-body-h1",
  heading(node, ctx) {
    if (node.depth === 1) {
      throw bodyH1Error(ctx.fileURL, 'a level-1 heading ("# Title" or a line underlined with "=")');
    }
  },
  html(node, ctx) {
    if (H1_TAG.test(node.value ?? "")) throw bodyH1Error(ctx.fileURL, "an <h1> tag");
  },
  mdxJsxFlowElement(node, ctx) {
    if (node.name === "h1") throw bodyH1Error(ctx.fileURL, "an <h1> element");
  },
  mdxJsxTextElement(node, ctx) {
    if (node.name === "h1") throw bodyH1Error(ctx.fileURL, "an <h1> element");
  },
};
