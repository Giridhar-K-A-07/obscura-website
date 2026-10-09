// Fails when a blog post (content/posts/**/*.md|mdx) contains a construct that is not allowed in
// published articles: scripts and other active HTML, event-handler attributes, javascript:/data:
// links, links that are not https / site paths / in-page anchors, images without alt text, images
// that are not https or site paths, and MDX imports, exports or client directives (posts ship no
// client-side JavaScript). Code blocks and inline code are not scanned: showing such code is fine.
// Run with: npm run check:posts
//
// The same `findUnsafe` function is used by the site build (src/lib/blogContent.ts), so a post
// that fails here is also never published.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const POST_FILE = /\.(md|mdx)$/;

/** Removes the YAML front matter, if any. */
export function stripFrontmatter(text) {
  return text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
}

/** Removes fenced code blocks and inline code spans, so that code is never scanned. */
export function stripCode(text) {
  const kept = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length) fence = null;
      kept.push("");
    } else if (open) {
      fence = open[1];
      kept.push("");
    } else {
      kept.push(line);
    }
  }
  return kept.join("\n").replace(/(`+)[^`]*?\1/g, "");
}

const SAFE_URL = /^(https:\/\/\S+|\/(?!\/)\S*|#\S*)$/;
const SAFE_MEDIA_URL = /^(https:\/\/\S+|\/(?!\/)\S*)$/;

const BLOCKED_TAGS = /<\s*(script|iframe|object|embed|style|form|base|meta|link)\b/gi;
const EVENT_HANDLER = /<[^>]*\son[a-z]+\s*=/gi;
const DANGEROUS_SCHEME =
  /(\]\(\s*<?|\]:\s*<?|\b(?:href|src|action|formaction|xlink:href)\s*=\s*["']?\s*|<)(javascript|vbscript|data)\s*:/gi;
const MDX_MODULE =
  /^(import\s+[\w{*"'][^\n]*\sfrom\s+["'][^"']+["']|import\s+["'][^"']+["']|export\s+(const|let|var|function|default|async|class)\b)/gm;
const CLIENT_DIRECTIVE = /\bclient:(load|idle|visible|media|only)\b/g;

const MD_INLINE = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const MD_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm;
const AUTOLINK = /<([a-z][a-z0-9+.-]*:[^>\s]*)>/gi;
const HTML_A = /<a\b[^>]*\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const HTML_IMG = /<img\b[^>]*>/gi;

const attr = (tag, name) => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : undefined;
};

const snippet = (text) => text.replace(/\s+/g, " ").trim().slice(0, 60);

/**
 * Returns the problems found in a post body (without front matter), as `{ rule, detail }`.
 * An empty list means the body is allowed.
 */
export function findUnsafe(body) {
  const text = stripCode(body);
  const problems = [];
  const add = (rule, detail) => problems.push({ rule, detail: snippet(detail) });

  for (const m of text.matchAll(BLOCKED_TAGS)) add("blocked-html-tag", m[0]);
  for (const m of text.matchAll(EVENT_HANDLER)) add("event-handler-attribute", m[0]);
  for (const m of text.matchAll(DANGEROUS_SCHEME)) add("dangerous-url-scheme", m[0]);
  for (const m of text.matchAll(MDX_MODULE)) add("mdx-import-export", m[0]);
  for (const m of text.matchAll(CLIENT_DIRECTIVE)) add("client-directive", m[0]);

  for (const m of text.matchAll(MD_INLINE)) {
    const [whole, bang, alt, url] = m;
    if (bang) {
      if (alt.trim() === "") add("image-missing-alt", whole);
      if (!SAFE_MEDIA_URL.test(url)) add("unsafe-media-url", whole);
    } else if (!SAFE_URL.test(url)) {
      add("unsafe-link", whole);
    }
  }
  for (const m of text.matchAll(MD_DEFINITION)) {
    if (!SAFE_URL.test(m[1])) add("unsafe-link", m[0]);
  }
  for (const m of text.matchAll(AUTOLINK)) {
    if (!SAFE_URL.test(m[1])) add("unsafe-link", m[0]);
  }
  for (const m of text.matchAll(HTML_A)) {
    const url = m[1] ?? m[2] ?? m[3] ?? "";
    if (!SAFE_URL.test(url)) add("unsafe-link", m[0]);
  }
  for (const m of text.matchAll(HTML_IMG)) {
    const alt = attr(m[0], "alt");
    const src = attr(m[0], "src");
    if (alt === undefined || alt.trim() === "") add("image-missing-alt", m[0]);
    if (src === undefined || !SAFE_MEDIA_URL.test(src)) add("unsafe-media-url", m[0]);
  }
  return problems;
}

function* postFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* postFiles(path);
    else if (POST_FILE.test(entry)) yield path;
  }
}

/** Returns a list of problems found in the posts under `root` (the content folder). */
export function findPostViolations(root) {
  const folder = join(root, "posts");
  let files;
  try {
    files = [...postFiles(folder)];
  } catch {
    return []; // no posts folder: nothing to check
  }
  const problems = [];
  for (const file of files) {
    const body = stripFrontmatter(readFileSync(file, "utf8"));
    for (const { rule, detail } of findUnsafe(body)) {
      problems.push(`${relative(root, file)}: ${rule}: ${detail}`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../content", import.meta.url));
  const problems = findPostViolations(root);
  if (problems.length) {
    console.error(`check:posts failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("check:posts passed: no post contains an unsafe construct.");
}
