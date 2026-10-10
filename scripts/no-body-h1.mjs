// A Sätteri (Markdown/MDX) plugin that keeps an article or event body to what the page expects,
// using the real parser as the source of truth.
//
// 1. No second h1. The page's title is its one h1 (Master Brief §11.1: one h1 per page), so a body
//    must start at ##. The text rule in check-posts.mjs (`findUnsafe`) gives authors a fast
//    message, but headings can sit inside nested lists and quotes in many ways that a line pattern
//    cannot cover. This plugin runs on the parsed tree while the page is rendered, so it sees every
//    depth-1 heading however it was written, and nothing that is only code or text:
//     - an ATX or setext heading of depth 1, at any nesting (lists, quotes, list items in quotes);
//     - raw HTML containing an <h1> tag (Markdown), or an <h1> element (MDX).
//
// 2. No JavaScript in an MDX body. An MDX expression ({...}), import/export or attribute
//    expression is arbitrary JavaScript, and the parser hands it over as an opaque string, so no
//    pattern can say what element it will build: `{(() => { const T = "h" + "1"; return <T/>; })()}`
//    renders an <h1> (or a <script>) with neither tag written in the source. Articles need none of
//    that (they are Markdown plus literal elements, and ship no client JavaScript), so these nodes
//    are rejected unless they are provably inert: a comment ({/* note */}) or plain literals and
//    arithmetic. `isInertExpression` is an allow-list scanner, not a JavaScript parser: it accepts
//    only whitespace, comments, numbers, quoted strings, true/false/null and + - * / % ( ) , and
//    anything else, including every identifier, `<`, a template string or a bracket, fails closed.
//    With no identifiers an expression cannot reach the JSX runtime or any element constructor.
//
// It fails the render instead of changing what the author wrote. An .mdx body stops the build with
// the file named. For a .md body, Astro's content loader only logs the error and the entry renders
// with an empty body, so no second h1 is ever output, but the article would be silently empty:
// `npm run check:posts` (check-body-structure.mjs, run in CI) compiles every body with this plugin
// and fails, so the mistake is caught before it is merged. Code blocks and inline code are not
// headings, so they pass.

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
  Object.assign(
    new Error(
      `${fileLabel(fileURL)}: ${what}. The page's title is its one h1, so an article or event body ` +
        'must start its headings at "##".',
    ),
    { rule: "body-h1" },
  );

/** The error thrown for JavaScript in an MDX body. */
export const bodyMdxError = (fileURL, what) =>
  Object.assign(
    new Error(
      `${fileLabel(fileURL)}: ${what}. An article or event body is Markdown with literal elements: ` +
        "MDX imports, exports and JavaScript expressions are not allowed (a {/* comment */} and plain " +
        "literals are). Write the content directly.",
    ),
    { rule: "body-mdx" },
  );

// Sticky token patterns for the allow-list scanner below.
const TOKENS = [
  /\s+/y,
  /\/\*[\s\S]*?\*\//y, // block comment (an unterminated one does not match)
  /\/\/[^\n]*/y, // line comment
  /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y, // number
  /"(?:[^"\\\n]|\\.)*"/y, // double-quoted string
  /'(?:[^'\\\n]|\\.)*'/y, // single-quoted string
  /(?:true|false|null)(?![A-Za-z0-9_$])/y,
  /[+\-*/%(),]/y, // arithmetic and grouping
];

/**
 * Whether an MDX expression is inert: only comments, plain literals and arithmetic, so it cannot
 * name a variable, call a function or build an element. Anything unrecognised is not inert.
 */
export function isInertExpression(code) {
  let i = 0;
  scan: while (i < code.length) {
    for (const token of TOKENS) {
      token.lastIndex = i;
      const match = token.exec(code);
      if (match && match[0].length > 0) {
        i += match[0].length;
        continue scan;
      }
    }
    return false;
  }
  return true;
}

const EXPRESSION = "an MDX JavaScript expression that is not a comment or a plain literal";

/** An MDX JSX element's name and attribute expressions. */
function checkJsx(node, ctx) {
  if (node.name === "h1") throw bodyH1Error(ctx.fileURL, "an <h1> element");
  for (const attribute of node.attributes ?? []) {
    if (attribute.type === "mdxJsxExpressionAttribute" && !isInertExpression(attribute.value)) {
      throw bodyMdxError(ctx.fileURL, `a JSX spread or ${EXPRESSION}`);
    }
    const value = attribute.value;
    if (
      value &&
      typeof value === "object" &&
      value.type === "mdxJsxAttributeValueExpression" &&
      !isInertExpression(value.value)
    ) {
      throw bodyMdxError(ctx.fileURL, `a JSX attribute with ${EXPRESSION}`);
    }
  }
}

const checkExpression = (node, ctx) => {
  if (!isInertExpression(node.value ?? "")) throw bodyMdxError(ctx.fileURL, `${EXPRESSION}`);
};

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
  mdxJsxFlowElement: checkJsx,
  mdxJsxTextElement: checkJsx,
  mdxFlowExpression: checkExpression,
  mdxTextExpression: checkExpression,
  mdxjsEsm(_node, ctx) {
    throw bodyMdxError(ctx.fileURL, "an MDX import or export");
  },
};
